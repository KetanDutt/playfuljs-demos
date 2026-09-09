/* Small standards-based Pointer Lock helper. */
(function () {
  'use strict';
  window.lockPointer = function (element, onMove) {
    if (!element || !element.requestPointerLock) return false;
    element.requestPointerLock();
    function move(event) { onMove({ x: event.movementX || 0, y: event.movementY || 0 }); }
    function change() {
      document.removeEventListener('mousemove', move);
      if (document.pointerLockElement === element) document.addEventListener('mousemove', move);
    }
    document.addEventListener('pointerlockchange', change, { passive: true });
    return true;
  };
  window.pointerRelease = function () {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  };
}());
