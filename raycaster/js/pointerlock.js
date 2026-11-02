/* Standards-based Pointer Lock helper; keep exactly one active listener. */
(function () {
  'use strict';
  var activeElement = null;
  var moveHandler = null;
  function move(event) {
    if (moveHandler && document.pointerLockElement === activeElement) {
      moveHandler({ x: event.movementX || 0, y: event.movementY || 0 });
    }
  }
  document.addEventListener('mousemove', move);
  window.lockPointer = function (element, onMove) {
    if (!element || !element.requestPointerLock) return false;
    activeElement = element;
    moveHandler = onMove;
    var request = element.requestPointerLock();
    if (request && request.catch) request.catch(function () {});
    return true;
  };
  window.pointerRelease = function () {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  };
}());
