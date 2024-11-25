<template>
  <div>
    <h1>{{ msg }}</h1>
    <div class="card">
      <button @click="count++">Count is {{ count }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      count: 0
    }
  }
}
</script>

<style scoped>
.card {
  padding: 2em;
}
</style>
