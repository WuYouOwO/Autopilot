import { ref, onMounted, onUnmounted } from 'vue'

export interface PollingOptions {
  intervalMs?: number
  immediate?: boolean
  pauseWhenHidden?: boolean
}

export function usePolling(fn: () => Promise<void> | void, options: PollingOptions = {}) {
  const { intervalMs = 2500, immediate = true, pauseWhenHidden = true } = options
  const isRunning = ref(false)
  const isExecuting = ref(false)
  let timerId: ReturnType<typeof setTimeout> | null = null

  const execute = async () => {
    if (!isRunning.value || isExecuting.value) return
    isExecuting.value = true
    try {
      await fn()
    } catch (err) {
      console.warn('[Polling] Tick failed, will retry next cycle:', err)
    } finally {
      isExecuting.value = false
      if (isRunning.value) {
        timerId = setTimeout(execute, intervalMs)
      }
    }
  }

  const start = () => {
    if (isRunning.value) return
    isRunning.value = true
    if (immediate) {
      execute()
    } else {
      timerId = setTimeout(execute, intervalMs)
    }
  }

  const stop = () => {
    isRunning.value = false
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  const handleVisibilityChange = () => {
    if (!pauseWhenHidden) return
    if (document.hidden) {
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }
    } else if (isRunning.value && !timerId) {
      execute()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    start()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stop()
  })

  return {
    isRunning,
    start,
    stop,
  }
}
