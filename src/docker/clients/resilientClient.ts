import type { DockerRequestOptions, LocalClient } from "./localClient"

export interface ResilienceOptions {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  jitter?: boolean

  circuitBreakerFailures?: number
  circuitBreakerResetMs?: number
}

export class ResilientClient implements LocalClient {
  private failures = 0
  private circuitOpenUntil = 0

  constructor(
    private readonly inner: LocalClient,
    private readonly opts: ResilienceOptions = {},
  ) {}

  async request<T>(options: DockerRequestOptions): Promise<T> {
    this.ensureCircuit()

    const retries = this.opts.retries ?? 3
    const baseDelay = this.opts.baseDelayMs ?? 100
    const maxDelay = this.opts.maxDelayMs ?? 2000
    const jitter = this.opts.jitter ?? true

    let attempt = 0

    while (true) {
      try {
        const result = await this.inner.request<T>(options)
        this.resetCircuit()
        return result
      } catch (err) {
        attempt++

        if (attempt > retries) {
          this.recordFailure()
          throw err
        }

        const delay = this.computeBackoff(attempt, baseDelay, maxDelay, jitter)
        await this.sleep(delay)
      }
    }
  }

  // -------------------------------
  // Circuit breaker logic
  // -------------------------------
  private ensureCircuit() {
    const now = Date.now()
    if (now < this.circuitOpenUntil) {
      throw new Error("Circuit breaker is OPEN — refusing requests")
    }
  }

  private recordFailure() {
    const threshold = this.opts.circuitBreakerFailures ?? 5
    const resetMs = this.opts.circuitBreakerResetMs ?? 5000

    this.failures++

    if (this.failures >= threshold) {
      this.circuitOpenUntil = Date.now() + resetMs
      this.failures = 0
    }
  }

  private resetCircuit() {
    this.failures = 0
    this.circuitOpenUntil = 0
  }

  // -------------------------------
  // Backoff logic
  // -------------------------------
  private computeBackoff(attempt: number, base: number, max: number, jitter: boolean) {
    let delay = Math.min(max, base * 2 ** (attempt - 1))
    if (jitter) delay = delay * (0.5 + Math.random() * 0.5)
    return delay
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
