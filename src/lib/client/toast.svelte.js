let _msg = $state("");
let _type = $state("");
let _timer = null;

export const toastState = {
  get msg() {
    return _msg;
  },
  get type() {
    return _type;
  },
};

export function toast(msg, type = "") {
  clearTimeout(_timer);
  _msg = msg;
  _type = type;
  _timer = setTimeout(() => {
    _msg = "";
  }, 3200);
}
