export class ColorLog {
  private static bg = '#1f1d2e';
  private static plainColor = '#e0def4';
  private static primaryColor = '#ebbcba';
  private static secondaryColor = '#31748f';
  private static subtleColor = '#908caa';
  private static warnColor = '#f6c177';
  private static errorColor = '#eb6f92';

  private constructor() {}

  private static hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  private static log(text: string, fgHex?: string, bgHex?: string) {
    let code = '';
    if (fgHex) {
      const [r, g, b] = this.hexToRgb(fgHex);
      code += `\x1b[38;2;${r};${g};${b}m`;
    }
    if (bgHex) {
      const [r, g, b] = this.hexToRgb(bgHex);
      code += `\x1b[48;2;${r};${g};${b}m`;
    }
    console.log(code + text + '\x1b[0m');
  }

  public static plain(text: string) {
    this.log(text, this.plainColor, this.bg);
  }
  public static primary(text: string) {
    this.log(text, this.primaryColor, this.bg);
  }
  public static secondary(text: string) {
    this.log(text, this.secondaryColor, this.bg);
  }
  public static subtle(text: string) {
    this.log(text, this.subtleColor, this.bg);
  }
  public static warn(text: string) {
    this.log(text, this.warnColor, this.bg);
  }
  public static error(text: string) {
    this.log(text, this.errorColor, this.bg);
  }
}
