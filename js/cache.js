const PREFIX = 'pq_v1_';

export function get(key) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key));
  } catch { return null; }
}

export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}