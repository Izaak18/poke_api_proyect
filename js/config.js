let config = null;
let typesData = null;

export function setConfig(data) { config = data; }
export function getConfig() { return config; }

export function setTypesData(data) { typesData = data; }
export function getTypesData() { return typesData; }

export function getTypeColor(type) { return typesData?.colors?.[type] || '#888'; }
export function getAllTypes() { return typesData?.order || []; }
export function getTypeChart() { return typesData?.chart || {}; }