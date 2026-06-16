export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 200) {
  let timer: number | undefined

  return (...args: Parameters<T>) => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    timer = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }
}
