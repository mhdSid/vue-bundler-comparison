// scripts/compare-builds.js
const fs = require('fs')
const path = require('path')
const { filesize } = require('filesize')
const glob = require('glob')
const { execSync } = require('child_process')

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
    assetsByChunk[asset.name] = {
      size: asset.size,
      type: path.extname(asset.name).slice(1)
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

  return {
    chunks: assetsByChunk
  }
}

function measureBuildTime(command, cwd) {
  const start = Date.now()
  try {
    execSync(command, { 
      cwd,
      stdio: 'inherit' // This will show the build output in real-time
    })
    return Date.now() - start
  } catch (error) {
    console.error(`Build failed: ${error.message}`)
    process.exit(1)
  }
}

async function main() {
  console.log('\nCleaning previous builds...')
  try {
    execSync('yarn clean', { stdio: 'inherit' })
  } catch (error) {
    console.warn('Clean failed, continuing...')
  }

  // Measure Vite build time
  console.log('\nBuilding Vite app...')
  const viteBuildTime = measureBuildTime('yarn build', path.join(__dirname, '../packages/app-vite'))
  const viteStats = analyzeViteStats()
  const viteDistSize = getDirectorySize(path.join(__dirname, '../packages/app-vite/dist'))

  // Measure Webpack build time
  console.log('\nBuilding Webpack app...')
  const webpackBuildTime = measureBuildTime('yarn build', path.join(__dirname, '../packages/app-webpack'))
  const webpackStats = analyzeWebpackStats()
  const webpackDistSize = getDirectorySize(path.join(__dirname, '../packages/app-webpack/dist'))

  // Print comparison
  console.log('\nBuild Comparison Results:')
  console.log('========================')
  
  console.log('\nBuild Times:')
  console.log(`Vite: ${viteBuildTime}ms`)
  console.log(`Webpack: ${webpackBuildTime}ms`)
  console.log(`Difference: ${Math.abs(viteBuildTime - webpackBuildTime)}ms (${
    viteBuildTime < webpackBuildTime ? 'Vite faster' : 'Webpack faster'
  })`)
  
  console.log('\nTotal Bundle Sizes:')
  console.log(`Vite: ${filesize(viteDistSize)}`)
  console.log(`Webpack: ${filesize(webpackDistSize)}`)
  
  console.log('\nChunk Analysis:')
  console.log('\nVite Chunks:')
  Object.entries(viteStats.chunks).forEach(([name, info]) => {
    console.log(`  ${name}: ${filesize(info.size)}`)
  })
  
  console.log('\nWebpack Chunks:')
  Object.entries(webpackStats.chunks).forEach(([name, info]) => {
    console.log(`  ${name}: ${filesize(info.size)}`)
  })
}

main().catch(console.error)
