<template>
  <div class="chart-container">
    <Line v-if="chartData" :data="chartData" :options="chartOptions" />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale } from 'chart.js'
import memoryProfileData from '../../../memory-profile.json'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

export default defineComponent({
  name: 'MemoryProfileChart',
  components: { Line },
  setup () {
    const chartData = ref({
      datasets: []
    })
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Time (ms)'
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Memory Usage (MB)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y.toFixed(2)
              return `${label}: ${value} MB`
            }
          }
        }
      }
    }

    const updateChartData = () => {
      const viteData = memoryProfileData.vite.map(entry => ({
        x: entry.timestamp - memoryProfileData.vite[0].timestamp,
        y: entry.heapUsed / 1024 / 1024 // Convert to MB
      }))

      const webpackData = memoryProfileData.webpack.map(entry => ({
        x: entry.timestamp - memoryProfileData.webpack[0].timestamp,
        y: entry.heapUsed / 1024 / 1024 // Convert to MB
      }))

      chartData.value = {
        datasets: [
          {
            label: 'Vite',
            data: viteData,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          },
          {
            label: 'Webpack',
            data: webpackData,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
          }
        ]
      }
    }

    onMounted(() => {
      updateChartData()
    })

    watch(memoryProfileData, () => {
      updateChartData()
    }, { deep: true })

    return { chartData, chartOptions }
  }
})
</script>

<style scoped>
.chart-container {
  height: 400px;
}
</style>
