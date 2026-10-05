import re

with open('src/views/ConsoleView.vue', 'r') as f:
    content = f.read()

missing_vars = """
const showAddTestModal = ref(false)
const isRunningTests = ref(false)
const isRefreshingStun = ref(false)
const stunServers = ref([])
const logsList = ref([])
const newTestForm = ref({ name: '', src: '', dst: '' })

const runAllTests = () => {
  isRunningTests.value = true
  setTimeout(() => { isRunningTests.value = false }, 1000)
}
const refreshStun = () => {
  isRefreshingStun.value = true
  setTimeout(() => { isRefreshingStun.value = false }, 1000)
}
const clearLogs = () => {
  logsList.value = []
}
const saveSettings = () => {
  showToast('Settings saved')
}
const addTestCase = () => {
  showAddTestModal.value = false
}
"""

content = re.sub(r'(const showNetworkModal = ref\(false\))', missing_vars + r'\n\1', content)

with open('src/views/ConsoleView.vue', 'w') as f:
    f.write(content)
