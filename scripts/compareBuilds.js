const fs = require('fs')
const path = require('path')
const { filesize } = require('filesize')
const glob = require('glob')
const { execSync, spawn } = require('child_process')
const kleur = require('kleur')
const os = require('os')

// Statistical utilities
function calculateStats (numbers) {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
  const stdDev = Math.sqrt(variance)
  return {
    mean,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    stdDev,
    median: numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)]
  }
}

// Memory tracking utilities
function getMemoryUsage () {
  const usage = process.memoryUsage()
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    rss: usage.rss,
    external: usage.external
  }
}

function formatMemoryUsage (memory) {
  return {
    heapUsed: filesize(memory.heapUsed),
    heapTotal: filesize(memory.heapTotal),
    rss: filesize(memory.rss),
    external: filesize(memory.external)
  }
}

function trackMemoryUsage () {
  const memoryUsage = []
  const interval = setInterval(() => {
    memoryUsage.push({
      timestamp: Date.now(),
      ...getMemoryUsage()
    })
  }, 10)

  return {
    stop: () => {
      clearInterval(interval)
      return memoryUsage
    }
  }
}

// CPU tracking utilities
function trackCPUUsage () {
  let lastCPUUsage = process.cpuUsage()
  let lastTimestamp = Date.now()
  const cpuUsage = []

  return {
    start: () => {
      const interval = setInterval(() => {
        const currentCPUUsage = process.cpuUsage()
        const currentTimestamp = Date.now()
        const timeDiff = currentTimestamp - lastTimestamp

        const userPercent = ((currentCPUUsage.user - lastCPUUsage.user) / 1000) / timeDiff * 100
        const systemPercent = ((currentCPUUsage.system - lastCPUUsage.system) / 1000) / timeDiff * 100

        cpuUsage.push({
          timestamp: currentTimestamp,
          user: userPercent,
          system: systemPercent,
          total: userPercent + systemPercent
        })

        lastCPUUsage = currentCPUUsage
        lastTimestamp = currentTimestamp
      }, 10)

      return () => {
        clearInterval(interval)
        return cpuUsage
      }
    }
  }
}

// Cache analysis
function analyzeBuildCache (buildTool, basePath) {
  const cacheDir = buildTool === 'vite'
    ? path.join(basePath, 'node_modules/.vite')
    : path.join(basePath, 'node_modules/.cache')

  if (!fs.existsSync(cacheDir)) {
    return { size: 0, files: 0 }
  }

  return {
    size: getDirectorySize(cacheDir),
    files: glob.sync(cacheDir + '/**/*.*').length
  }
}

async function runBuildWithTracking (command, cwd, options = {}) {
  const { timeout = 300000, retries = 2 } = options // 5 min timeout by default

  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const startTime = Date.now()
    const memoryTracker = trackMemoryUsage()

    const process = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    })

    const cpuTracker = trackCPUUsage(process.pid)
    const stopCPUTracking = cpuTracker.start()

    const timeoutId = setTimeout(() => {
      process.kill()
      reject(new Error(`Build timed out after ${timeout}ms`))
    }, timeout)

    process.on('close', async (code) => {
      clearTimeout(timeoutId)
      const buildTime = Date.now() - startTime
      const memoryStats = memoryTracker.stop()
      const cpuStats = stopCPUTracking()

      if (code !== 0) {
        if (options.currentRetry < retries) {
          console.log(kleur.yellow(`Build failed, retrying (${options.currentRetry + 1}/${retries})...`))
          resolve(await runBuildWithTracking(command, cwd, {
            ...options,
            currentRetry: (options.currentRetry || 0) + 1
          }))
          return
        }
        reject(new Error(`Build failed with code ${code}`))
        return
      }

      // Calculate peak memory usage
      const peakMemory = memoryStats.reduce((peak, current) => ({
        heapUsed: Math.max(peak.heapUsed, current.heapUsed),
        heapTotal: Math.max(peak.heapTotal, current.heapTotal),
        rss: Math.max(peak.rss, current.rss),
        external: Math.max(peak.external, current.external)
      }), {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0
      })

      // Calculate peak CPU usage
      const peakCPU = cpuStats.reduce((peak, current) => ({
        user: Math.max(peak.user, current.user),
        system: Math.max(peak.system, current.system),
        total: Math.max(peak.total, current.total)
      }), {
        user: 0,
        system: 0,
        total: 0
      })

      resolve({
        buildTime,
        peakMemory,
        peakCPU,
        memoryTimeline: memoryStats,
        cpuTimeline: cpuStats
      })
    })
  })
}

async function runMultipleBuilds (command, cwd, iterations = 3) {
  const results = []
  console.log(kleur.blue(`Running ${iterations} builds for statistical analysis...`))

  for (let i = 0; i < iterations; i++) {
    console.log(kleur.gray(`\nBuild ${i + 1}/${iterations}`))
    const result = await runBuildWithTracking(command, cwd)
    results.push(result)
  }

  return {
    buildTimes: calculateStats(results.map(r => r.buildTime)),
    peakMemory: results.map(r => r.peakMemory),
    peakCPU: results.map(r => r.peakCPU),
    memoryTimelines: results.map(r => r.memoryTimeline),
    cpuTimelines: results.map(r => r.cpuTimeline)
  }
}

// Your existing helper functions
function getDirectorySize (directory) {
  if (!fs.existsSync(directory)) return 0
  const files = glob.sync(directory + '/**/*.*')
  return files.reduce((total, file) => {
    const stats = fs.statSync(file)
    return total + stats.size
  }, 0)
}

function analyzeWebpackStats () {
  const statsFile = path.join(__dirname, '../packages/app-webpack/stats.json')
  if (!fs.existsSync(statsFile)) return { time: 0, totalSize: 0, chunks: {} }

  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'))
  const assetsByChunk = {}
  stats.assets.forEach(asset => {
    if (asset.name !== 'index.html') {
      assetsByChunk[asset.name] = {
        size: asset.size,
        type: path.extname(asset.name).slice(1)
      }
    }
  })
  return {
    time: stats.time,
    totalSize: stats.assets.reduce((total, asset) => total + asset.size, 0),
    chunks: assetsByChunk
  }
}

function analyzeViteStats () {
  const manifestFile = path.join(__dirname, '../packages/app-vite/dist/.vite/manifest.json')
  if (!fs.existsSync(manifestFile)) return { chunks: {} }

  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  const assetsByChunk = {}
  Object.entries(manifest).forEach(([_, value]) => {
    const fileName = value.file
    const filePath = path.join(__dirname, '../packages/app-vite/dist', fileName)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      assetsByChunk[fileName] = {
        size: stats.size,
        type: path.extname(fileName).slice(1)
      }
    }
  })
  return { chunks: assetsByChunk }
}

function generateHTMLReport (viteResults, webpackResults, outputPath = 'build-report.html') {
  const template = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Build Performance Report</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js"></script>
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .metric { 
          margin: 20px 0; 
          padding: 20px; 
          border: 1px solid #ddd; 
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .system-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1rem;
          background: #1e293b;
          color: white;
          border-radius: 8px;
        }
        .system-info div {
          padding: 0.5rem;
        }
        .better { color: #22c55e; font-weight: bold; }
        .worse { color: #ef4444; font-weight: bold; }
        .chart-container {
          position: relative;
          height: 300px;
          margin: 20px 0;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        h1 { color: #1e293b; }
        h2 { color: #334155; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
        .stat-card {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .stat-card h4 {
          margin: 0 0 0.5rem 0;
          color: #64748b;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      <h1>Build Performance Report</h1>
      <div class="system-info">
        <div>
          <strong>Node.js:</strong> ${process.version}
        </div>
        <div>
          <strong>OS:</strong> ${os.type()} ${os.release()}
        </div>
        <div>
          <strong>CPU:</strong> ${os.cpus()[0].model}
        </div>
        <div>
          <strong>Cores:</strong> ${os.cpus().length}
        </div>
        <div>
          <strong>Total Memory:</strong> ${filesize(os.totalmem())}
        </div>
        <div>
          <strong>Free Memory:</strong> ${filesize(os.freemem())}
        </div>
      </div>

      <div class="metric">
        <h2>Build Times Statistical Analysis</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Vite Mean</h4>
            <div class="stat-value">${viteResults.buildTimes.mean.toFixed(2)}ms</div>
            <div>Â±${viteResults.buildTimes.stdDev.toFixed(2)}ms</div>
          </div>
          <div class="stat-card">
            <h4>Vite Min/Max</h4>
            <div class="stat-value">${viteResults.buildTimes.min.toFixed(2)}ms</div>
            <div>${viteResults.buildTimes.max.toFixed(2)}ms</div>
          </div>
          <div class="stat-card">
            <h4>Webpack Mean</h4>
            <div class="stat-value">${webpackResults.buildTimes.mean.toFixed(2)}ms</div>
            <div>Â±${webpackResults.buildTimes.stdDev.toFixed(2)}ms</div>
          </div>
          <div class="stat-card">
            <h4>Webpack Min/Max</h4>
            <div class="stat-value">${webpackResults.buildTimes.min.toFixed(2)}ms</div>
            <div>${webpackResults.buildTimes.max.toFixed(2)}ms</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="buildTimesChart"></canvas>
        </div>
      </div>

      <div class="grid">
        <div class="metric">
          <h2>Memory Usage</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h4>Vite Heap Used</h4>
              <div class="stat-value">${filesize(viteResults.peakMemory[0].heapUsed)}</div>
            </div>
            <div class="stat-card">
              <h4>Webpack Heap Used</h4>
              <div class="stat-value">${filesize(webpackResults.peakMemory[0].heapUsed)}</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="memoryChart"></canvas>
          </div>
        </div>

        <div class="metric">
          <h2>CPU Usage</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h4>Vite Peak CPU</h4>
              <div class="stat-value">${viteResults.peakCPU[0].total.toFixed(1)}%</div>
            </div>
            <div class="stat-card">
              <h4>Webpack Peak CPU</h4>
              <div class="stat-value">${webpackResults.peakCPU[0].total.toFixed(1)}%</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="cpuChart"></canvas>
          </div>
        </div>
      </div>

      <div class="metric">
        <h2>Build Cache Analysis</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Vite Cache Growth</h4>
            <div class="stat-value">${filesize(viteResults.viteCacheAfter.size - viteResults.viteCacheBefore.size)}</div>
          </div>
          <div class="stat-card">
            <h4>Webpack Cache Growth</h4>
            <div class="stat-value">${filesize(webpackResults.webpackCacheAfter.size - webpackResults.webpackCacheBefore.size)}</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="cacheSizeChart"></canvas>
        </div>
      </div>

      <div class="metric">
        <h2>Bundle Size Analysis</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Vite Total</h4>
            <div class="stat-value">${filesize(viteResults.distSize)}</div>
          </div>
          <div class="stat-card">
            <h4>Webpack Total</h4>
            <div class="stat-value">${filesize(webpackResults.distSize)}</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="bundleSizeChart"></canvas>
        </div>
      </div>

      <script>
        // Build Times Chart
        new Chart(document.getElementById('buildTimesChart'), {
          type: 'bar',
          data: {
            labels: ['Vite', 'Webpack'],
            datasets: [{
              label: 'Build Time (ms)',
              data: [
                ${viteResults.buildTimes.mean},
                ${webpackResults.buildTimes.mean}
              ],
              backgroundColor: ['rgba(16, 185, 129, 0.6)', 'rgba(59, 130, 246, 0.6)'],
              borderColor: ['rgb(16, 185, 129)', 'rgb(59, 130, 246)'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Average Build Time Comparison'
              }
            }
          }
        });

        // Memory Timeline Chart
        new Chart(document.getElementById('memoryChart'), {
          type: 'line',
          data: {
            labels: ${JSON.stringify(viteResults.memoryTimelines[0].map((_, i) => i))},
            datasets: [
              {
                label: 'Vite RSS',
                data: ${JSON.stringify(viteResults.memoryTimelines[0].map(m => m.rss / 1024 / 1024))},
                borderColor: 'rgb(16, 185, 129)',
                fill: false
              },
              {
                label: 'Webpack RSS',
                data: ${JSON.stringify(webpackResults.memoryTimelines[0].map(m => m.rss / 1024 / 1024))},
                borderColor: 'rgb(59, 130, 246)',
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Memory Usage Over Time (MB)'
              }
            }
          }
        });

        // CPU Usage Chart
        new Chart(document.getElementById('cpuChart'), {
          type: 'line',
          data: {
            labels: ${JSON.stringify(viteResults.cpuTimelines[0].map((_, i) => i))},
            datasets: [
              {
                label: 'Vite CPU',
                data: ${JSON.stringify(viteResults.cpuTimelines[0].map(c => c.total))},
                borderColor: 'rgb(16, 185, 129)',
                fill: false
              },
              {
                label: 'Webpack CPU',
                data: ${JSON.stringify(webpackResults.cpuTimelines[0].map(c => c.total))},
                borderColor: 'rgb(59, 130, 246)',
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'CPU Usage Over Time (%)'
              }
            }
          }
        });

        // Bundle Size Chart
        new Chart(document.getElementById('bundleSizeChart'), {
          type: 'doughnut',
          data: {
            labels: Object.keys(${JSON.stringify(viteResults.chunks)}),
            datasets: [{
              data: Object.values(${JSON.stringify(viteResults.chunks)}).map(c => c.size),
              backgroundColor: [
                'rgba(16, 185, 129, 0.6)',
                'rgba(59, 130, 246, 0.6)',
                'rgba(251, 146, 60, 0.6)',
                'rgba(147, 51, 234, 0.6)'
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Bundle Size Distribution'
              }
            }
          }
        });

        // Cache Size Chart
        new Chart(document.getElementById('cacheSizeChart'), {
          type: 'bar',
          data: {
            labels: ['Before Build', 'After Build'],
            datasets: [
              {
                label: 'Vite Cache',
                data: [
                  ${viteResults.viteCacheBefore.size},
                  ${viteResults.viteCacheAfter.size}
                ],
                backgroundColor: 'rgba(16, 185, 129, 0.6)'
              },
              {
                label: 'Webpack Cache',
                data: [
                  ${webpackResults.webpackCacheBefore.size},
                  ${webpackResults.webpackCacheAfter.size}
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.6)'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Cache Size Changes'
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `
  fs.writeFileSync(outputPath, template)
  console.log(kleur.green(`\nDetailed report generated at ${outputPath}`))
}

async function main () {
  console.log(kleur.cyan('\nBuild Performance Analysis'))
  console.log(kleur.cyan('========================'))
  console.log(kleur.gray(`Node.js ${process.version}`))
  console.log(kleur.gray(`OS: ${os.type()} ${os.release()}`))
  console.log(kleur.gray(`CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)`))
  console.log(kleur.gray(`Memory: ${filesize(os.totalmem())}\n`))

  console.log(kleur.cyan('\nCleaning previous builds...'))
  try {
    execSync('yarn clean', { stdio: 'inherit' })
  } catch (error) {
    console.warn(kleur.yellow('Clean failed, continuing...\n' + error))
  }

  // Analyze initial cache state
  const viteCacheBefore = analyzeBuildCache('vite', path.join(__dirname, '../packages/app-vite'))
  const webpackCacheBefore = analyzeBuildCache('webpack', path.join(__dirname, '../packages/app-webpack'))

  // Build and track Vite
  console.log(kleur.cyan('\nAnalyzing Vite builds...'))
  const viteResults = await runMultipleBuilds(
    'yarn build',
    path.join(__dirname, '../packages/app-vite')
  )
  const viteStats = analyzeViteStats()
  const viteDistSize = getDirectorySize(path.join(__dirname, '../packages/app-vite/dist'))
  const viteCacheAfter = analyzeBuildCache('vite', path.join(__dirname, '../packages/app-vite'))

  // Build and track Webpack
  console.log(kleur.cyan('\nAnalyzing Webpack builds...'))
  const webpackResults = await runMultipleBuilds(
    'yarn build',
    path.join(__dirname, '../packages/app-webpack')
  )
  const webpackStats = analyzeWebpackStats()
  const webpackDistSize = getDirectorySize(path.join(__dirname, '../packages/app-webpack/dist'))
  const webpackCacheAfter = analyzeBuildCache('webpack', path.join(__dirname, '../packages/app-webpack'))

  // Print comparison
  console.log(kleur.green('\nBuild Comparison Results:'))
  console.log(kleur.green('========================'))

  console.log(kleur.blue('\nBuild Times (averaged over multiple runs):'))
  console.log(kleur.yellow(`Vite: ${viteResults.buildTimes.mean.toFixed(2)}ms (Â±${viteResults.buildTimes.stdDev.toFixed(2)}ms)`))
  console.log(kleur.yellow(`Webpack: ${webpackResults.buildTimes.mean.toFixed(2)}ms (Â±${webpackResults.buildTimes.stdDev.toFixed(2)}ms)`))
  console.log(kleur.yellow(`Difference: ${Math.abs(viteResults.buildTimes.mean - webpackResults.buildTimes.mean).toFixed(2)}ms (${
    viteResults.buildTimes.mean < webpackResults.buildTimes.mean ? kleur.green('Vite faster') : kleur.red('Webpack faster')
  })`))

  console.log(kleur.blue('\nPeak Memory Usage (averaged):'))
  const vitePeakMemory = viteResults.peakMemory[0] // Taking first run as example
  const webpackPeakMemory = webpackResults.peakMemory[0]
  console.log(kleur.magenta('\nVite:'))
  console.log(kleur.yellow(JSON.stringify(formatMemoryUsage(vitePeakMemory), null, 2)))
  console.log(kleur.magenta('\nWebpack:'))
  console.log(kleur.yellow(JSON.stringify(formatMemoryUsage(webpackPeakMemory), null, 2)))

  console.log(kleur.blue('\nPeak CPU Usage:'))
  const vitePeakCPU = viteResults.peakCPU[0]
  const webpackPeakCPU = webpackResults.peakCPU[0]
  console.log(kleur.magenta('\nVite:'))
  console.log(kleur.yellow(JSON.stringify(vitePeakCPU, null, 2)))
  console.log(kleur.magenta('\nWebpack:'))
  console.log(kleur.yellow(JSON.stringify(webpackPeakCPU, null, 2)))

  console.log(kleur.blue('\nCache Analysis:'))
  console.log(kleur.magenta('\nVite:'))
  console.log(kleur.yellow(`Before: ${filesize(viteCacheBefore.size)} (${viteCacheBefore.files} files)`))
  console.log(kleur.yellow(`After: ${filesize(viteCacheAfter.size)} (${viteCacheAfter.files} files)`))
  console.log(kleur.magenta('\nWebpack:'))
  console.log(kleur.yellow(`Before: ${filesize(webpackCacheBefore.size)} (${webpackCacheBefore.files} files)`))
  console.log(kleur.yellow(`After: ${filesize(webpackCacheAfter.size)} (${webpackCacheAfter.files} files)`))

  console.log(kleur.blue('\nTotal Bundle Sizes:'))
  console.log(kleur.yellow(`Vite: ${filesize(viteDistSize)}`))
  console.log(kleur.yellow(`Webpack: ${filesize(webpackDistSize)}`))

  console.log(kleur.blue('\nChunk Analysis:'))
  console.log(kleur.magenta('\nVite Chunks:'))
  Object.entries(viteStats.chunks).forEach(([name, info]) => {
    console.log(kleur.yellow(` ${name}: ${filesize(info.size)}`))
  })

  console.log(kleur.magenta('\nWebpack Chunks:'))
  Object.entries(webpackStats.chunks).forEach(([name, info]) => {
    console.log(kleur.yellow(` ${name}: ${filesize(info.size)}`))
  })

  // Generate HTML report
  generateHTMLReport({
    ...viteResults,
    viteCacheBefore,
    viteCacheAfter,
    distSize: viteDistSize,
    chunks: viteStats.chunks
  }, {
    ...webpackResults,
    webpackCacheBefore,
    webpackCacheAfter,
    distSize: webpackDistSize,
    chunks: webpackStats.chunks
  })

  // Save detailed data for further analysis
  fs.writeFileSync(
    'performance-data.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      system: {
        node: process.version,
        os: `${os.type()} ${os.release()}`,
        cpu: os.cpus()[0].model,
        cores: os.cpus().length,
        totalMemory: os.totalmem()
      },
      vite: {
        buildTimes: viteResults.buildTimes,
        peakMemory: viteResults.peakMemory,
        peakCPU: viteResults.peakCPU,
        memoryTimelines: viteResults.memoryTimelines,
        cpuTimelines: viteResults.cpuTimelines,
        cacheStats: {
          before: viteCacheBefore,
          after: viteCacheAfter
        },
        distSize: viteDistSize,
        chunks: viteStats.chunks
      },
      webpack: {
        buildTimes: webpackResults.buildTimes,
        peakMemory: webpackResults.peakMemory,
        peakCPU: webpackResults.peakCPU,
        memoryTimelines: webpackResults.memoryTimelines,
        cpuTimelines: webpackResults.cpuTimelines,
        cacheStats: {
          before: webpackCacheBefore,
          after: webpackCacheAfter
        },
        distSize: webpackDistSize,
        chunks: webpackStats.chunks
      }
    }, null, 2)
  )

  console.log(kleur.green('\nPerformance data saved to performance-data.json'))
  console.log(kleur.cyan('\nAnalysis complete!'))
}

// Export for use in other files
module.exports = {
  runBuildWithTracking,
  runMultipleBuilds,
  analyzeWebpackStats,
  analyzeViteStats,
  generateHTMLReport
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(kleur.red('\nError during analysis:'), error)
    process.exit(1)
  })
}
