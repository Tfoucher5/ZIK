// Bouton son du bandeau : une page qui a un son pose `band.son = { on, toggle }`
// au montage et le remet à null en partant. `band.code = true` ouvre le digicode.
export const band = $state({ son: null, code: false });
