<template>
  <div>
    <HelloWorld msg="Vite App" />
    <DataTable :data="tableData" :columns="columns" />
  </div>
</template>

<script>
import { DataTable, HelloWorld } from '@vue-bundler-comparison/shared'

export default {
  name: 'App',
  components: {
    HelloWorld,
    DataTable
  },
  data() {
    return {
      columns: [
        { id: 'name', header: 'Name' },
        { id: 'date', header: 'Date', type: 'date' },
        { id: 'value', header: 'Value' }
      ],
      tableData: [
        { id: 1, name: 'Item 1', date: '2024-01-01', value: 100 },
        { id: 2, name: 'Item 2', date: '2024-01-02', value: 200 },
        { id: 3, name: 'Item 3', date: '2024-01-03', value: 300 }
      ]
    }
  }
}
</script>
