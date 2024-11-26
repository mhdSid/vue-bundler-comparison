const fs = require('fs')
const path = require('path')
const { filesize } = require('filesize')
const glob = require('glob')
const { execSync, spawn } = require('child_process')
const chalk = require('kleur')

// Memory tracking utilities
function getMemoryUsage() {
  const usage = process.memoryUsage()
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    rss: usage.rss,
    external: usage.external
  }
}

function formatMemoryUsage(memory) {
  return {
    heapUsed: filesize(memory.heapUsed),
    heapTotal: filesize(memory.heapTotal),
    rss: filesize(memory.rss),
    external: filesize(memory.external)
  }
}

function trackMemoryUsage() {
  const memoryUsage = []
  const interval = setInterval(() => {
    memoryUsage.push({
      timestamp: Date.now(),
      ...getMemoryUsage()
    })
  }, 100) // Sample every 100ms

  return {
    stop: () => {
      clearInterval(interval)
      return memoryUsage
    }
  }
}

async function runBuildWithMemoryTracking(command, cwd) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const startTime = Date.now()
    const memoryTracker = trackMemoryUsage()
    
    const process = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    })

    process.on('close', (code) => {
      const buildTime = Date.now() - startTime
      const memoryStats = memoryTracker.stop()
      
      if (code !== 0) {
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

      resolve({
        buildTime,
        peakMemory,
        memoryTimeline: memoryStats
      })
    })
  })
}

// Your existing helper functions remain the same
function getDirectorySize(directory) {
  const files = glob.sync(directory + '/**/*.*')
  return files.reduce((total, file) => {
    const stats = fs.statSync(file)
    return total + stats.size
  }, 0)
}

function analyzeWebpackStats() {
  const statsFile = path.join(__dirname, '../packages/app-webpack/stats.json')
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

function analyzeViteStats() {
  const manifestFile = path.join(__dirname, '../packages/app-vite/dist/.vite/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  const assetsByChunk = {}
  Object.entries(manifest).forEach(([key, value]) => {
    const fileName = value.file
    const filePath = path.join(__dirname, '../packages/app-vite/dist', fileName)
    const stats = fs.statSync(filePath)
    assetsByChunk[fileName] = {
      size: stats.size,
      type: path.extname(fileName).slice(1)
    }
  })
  return { chunks: assetsByChunk }
}

async function main() {
  console.log(chalk.cyan('\nCleaning previous builds...'))
  try {
    execSync('yarn clean', { stdio: 'inherit' })
  } catch (error) {
    console.warn(chalk.yellow('Clean failed, continuing...'))
  }

  // Build and track Vite
  console.log(chalk.cyan('\nBuilding Vite app...'))
  const viteResults = await runBuildWithMemoryTracking(
    'yarn build',
    path.join(__dirname, '../packages/app-vite')
  )
  const viteStats = analyzeViteStats()
  const viteDistSize = getDirectorySize(path.join(__dirname, '../packages/app-vite/dist'))

  // Build and track Webpack
  console.log(chalk.cyan('\nBuilding Webpack app...'))
  const webpackResults = await runBuildWithMemoryTracking(
    'yarn build',
    path.join(__dirname, '../packages/app-webpack')
  )
  const webpackStats = analyzeWebpackStats()
  const webpackDistSize = getDirectorySize(path.join(__dirname, '../packages/app-webpack/dist'))

  // Print comparison
  console.log(chalk.green('\nBuild Comparison Results:'))
  console.log(chalk.green('========================'))
  
  console.log(chalk.blue('\nBuild Times:'))
  console.log(chalk.yellow(`Vite: ${viteResults.buildTime}ms`))
  console.log(chalk.yellow(`Webpack: ${webpackResults.buildTime}ms`))
  console.log(chalk.yellow(`Difference: ${Math.abs(viteResults.buildTime - webpackResults.buildTime)}ms (${
    viteResults.buildTime < webpackResults.buildTime ? chalk.green('Vite faster') : chalk.red('Webpack faster')
  })`))

  console.log(chalk.blue('\nPeak Memory Usage:'))
  console.log(chalk.magenta('\nVite:'))
  console.log(chalk.yellow(JSON.stringify(formatMemoryUsage(viteResults.peakMemory), null, 2)))
  console.log(chalk.magenta('\nWebpack:'))
  console.log(chalk.yellow(JSON.stringify(formatMemoryUsage(webpackResults.peakMemory), null, 2)))

  console.log(chalk.blue('\nTotal Bundle Sizes:'))
  console.log(chalk.yellow(`Vite: ${filesize(viteDistSize)}`))
  console.log(chalk.yellow(`Webpack: ${filesize(webpackDistSize)}`))

  console.log(chalk.blue('\nChunk Analysis:'))
  console.log(chalk.magenta('\nVite Chunks:'))
  Object.entries(viteStats.chunks).forEach(([name, info]) => {
    console.log(chalk.yellow(` ${name}: ${filesize(info.size)}`))
  })

  console.log(chalk.magenta('\nWebpack Chunks:'))
  Object.entries(webpackStats.chunks).forEach(([name, info]) => {
    console.log(chalk.yellow(` ${name}: ${filesize(info.size)}`))
  })

  // Optionally save memory timeline data for visualization
  fs.writeFileSync(
    'memory-profile.json',
    JSON.stringify({
      vite: viteResults.memoryTimeline,
      webpack: webpackResults.memoryTimeline
    }, null, 2)
  )
}

main().catch(console.error)
