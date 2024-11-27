<template>
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.id"
            @click="() => handleSort(column.id)">
            {{ column.header }}
            <span v-if="sorting.field === column.id">
              {{ sorting.direction === 'asc' ? 'â†‘' : 'â†“' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sortedData" :key="row.id">
          <td v-for="column in columns" :key="column.id">
            <template v-if="column.type === 'date'">
              {{ formatDate(row[column.id]) }}
            </template>
            <template v-else>
              {{ row[column.id] }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { format } from 'date-fns'
import { computed, ref } from 'vue'

export default {
  name: 'DataTable',
  props: {
    data: {
      type: Array,
      required: true
    },
    columns: {
      type: Array,
      required: true
    }
  },
  setup (props) {
    const sorting = ref({ field: null, direction: 'asc' })

    const handleSort = (field) => {
      if (sorting.value.field === field) {
        sorting.value.direction = sorting.value.direction === 'asc' ? 'desc' : 'asc'
      } else {
        sorting.value = { field, direction: 'asc' }
      }
    }

    const sortedData = computed(() => {
      if (!sorting.value.field) return props.data

      return [...props.data].sort((a, b) => {
        const aVal = a[sorting.value.field]
        const bVal = b[sorting.value.field]

        const modifier = sorting.value.direction === 'asc' ? 1 : -1

        if (aVal < bVal) return -1 * modifier
        if (aVal > bVal) return 1 * modifier
        return 0
      })
    })

    const formatDate = (date) => {
      return format(new Date(date), 'MMM dd, yyyy')
    }

    return {
      sorting,
      handleSort,
      sortedData,
      formatDate
    }
  }
}
</script>

<style>
@import '../styles/theme.css';

.data-table-wrapper {
  margin: 1rem 0;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--table-bg);
}

.data-table th {
  background: var(--header-bg);
  padding: 0.75rem;
  text-align: left;
  cursor: pointer;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.data-table tbody tr:hover {
  background: var(--row-hover-bg);
}
</style>
