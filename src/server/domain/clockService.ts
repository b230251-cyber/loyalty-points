export class ClockService {
  private simulatedOffsetMs: number = 0;
  private fixedSimulatedTime: Date | null = null;

  /**
   * Returns the current date/time (either simulated or real system time).
   */
  public now(): Date {
    if (this.fixedSimulatedTime) {
      return new Date(this.fixedSimulatedTime);
    }
    return new Date(Date.now() + this.simulatedOffsetMs);
  }

  public nowIso(): string {
    return this.now().toISOString();
  }

  /**
   * Sets the clock to a specific date/time.
   */
  public setClock(timeInput: string | number | Date): Date {
    const targetDate = new Date(timeInput);
    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid date format provided for clock: ${timeInput}`);
    }
    this.fixedSimulatedTime = targetDate;
    this.simulatedOffsetMs = targetDate.getTime() - Date.now();
    return this.now();
  }

  /**
   * Advances the clock forward by days or milliseconds.
   */
  public advanceByDays(days: number): Date {
    const current = this.now();
    const newTime = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
    this.fixedSimulatedTime = newTime;
    this.simulatedOffsetMs = newTime.getTime() - Date.now();
    return this.now();
  }

  /**
   * Resets the clock to real system time.
   */
  public reset(): Date {
    this.fixedSimulatedTime = null;
    this.simulatedOffsetMs = 0;
    return this.now();
  }
}

export const globalClockService = new ClockService();
