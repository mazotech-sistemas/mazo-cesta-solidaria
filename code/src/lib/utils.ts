type ClassValue = string | false | null | undefined | Record<string, boolean>;

function _clsx(inputs: ClassValue[]): string {
  let out = '';
  for (const v of inputs) {
    if (!v) continue;
    if (typeof v === 'string') {
      out += (out ? ' ' : '') + v;
    } else if (typeof v === 'object') {
      for (const k in v) {
        if (v[k]) out += (out ? ' ' : '') + k;
      }
    }
  }
  return out;
}

export function cn(...inputs: ClassValue[]) {
  return _clsx(inputs);
}