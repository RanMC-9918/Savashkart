import * as THREE from "three";

console.log("Camera JS Loaded");

// -- Constants --
const DEG2RAD = Math.PI / 180.0;
const RIGHT_MOUSE_BUTTON = 2;
const LEFT_MOUSE_BUTTON = 1;

// Camera constraints
const CAMERA_SIZE = 5;
const MIN_CAMERA_RADIUS = 30;
const MAX_CAMERA_RADIUS = 60;
const MIN_CAMERA_ELEVATION = -45;
const MAX_CAMERA_ELEVATION = 45;

const MIN_CAMERA_YPOS = 0.5;

// Camera sensitivity

const senz = 0.04;
const AZIMUTH_SENSITIVITY = senz;
const ELEVATION_SENSITIVITY = senz;
const PAN_SENSITIVITY = -0.01;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class CameraManager {
  constructor() {
    const aspect =
      window.ui.gameWindow.clientWidth / window.ui.gameWindow.clientHeight;

    this.camera = new THREE.PerspectiveCamera(0, aspect);
    this.fov = 165;

    this.cameraOrigin = new THREE.Vector3(0, 0, 0);
    this.cameraRadius = 35; //100
    this.cameraAzimuth = -90;
    this.cameraElevation = 2.3; //2


    this.updateCameraPosition();

    window.ui.gameWindow.addEventListener(
      "wheel",
      this.onMouseScroll.bind(this),
      false
    );
    window.ui.gameWindow.addEventListener(
      "mousedown",
      this.onMouseMove.bind(this),
      false
    );
    window.ui.gameWindow.addEventListener(
      "mousemove",
      this.onMouseMove.bind(this),
      false
    );
  }

  /**
   * Applies any changes to camera position/orientation
   */
  updateCameraPosition() {
    this.camera.zoom = this.cameraRadius;
    this.camera.position.x =
      20 *
      Math.sin(this.cameraAzimuth * DEG2RAD);
    this.camera.position.y =  20 * Math.sin(this.cameraElevation * DEG2RAD);
    this.camera.position.z =
      20 *
      Math.cos(this.cameraAzimuth * DEG2RAD);
    this.camera.position.add(this.cameraOrigin);
    this.camera.position.y = Math.max(MIN_CAMERA_YPOS, this.camera.position.y);
    let look = new THREE.Vector3(0).copy(this.cameraOrigin);
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  /**
   * Event handler for `mousemove` event
   * @param {MouseEvent} event Mouse event arguments
   */
  onMouseMove(event) {
    // Lock pointer if not already

    const elem = window.ui.gameWindow;
    if (
      event.buttons === LEFT_MOUSE_BUTTON &&
      elem &&
      document.pointerLockElement !== elem
    ) {
      elem.requestPointerLock();
      return; // Don't move camera until pointer is locked
    }
    // Handles the rotation of the camera
    if (document.pointerLockElement === elem) {
      this.cameraAzimuth += -(event.movementX * AZIMUTH_SENSITIVITY);
      this.cameraElevation += event.movementY * ELEVATION_SENSITIVITY;
    }

    

    this.updateCameraPosition();
  }

  /**
   * Event handler for `wheel` event
   * @param {MouseEvent} event Mouse event arguments
   */
  onMouseScroll(event) {
    // Request fullscreen on scroll if not already
    // const elem = window.ui.gameWindow;
    // if (elem && document.fullscreenElement !== elem) {
    //   if (elem.requestFullscreen) {
    //     elem.requestFullscreen();
    //   } else if (elem.webkitRequestFullscreen) {
    //     elem.webkitRequestFullscreen();
    //   } else if (elem.msRequestFullscreen) {
    //     elem.msRequestFullscreen();
    //   }
    // }
    event.preventDefault();
    // this.cameraRadius *= 1 - event.deltaY * ZOOM_SENSITIVITY;
    // this.cameraRadius = Math.min(
    //   MAX_CAMERA_RADIUS,
    //   Math.max(MIN_CAMERA_RADIUS, this.cameraRadius)
    // );
    // this.updateCameraPosition();
  }

  resize() {
    const aspect =
      window.ui.gameWindow.clientWidth / window.ui.gameWindow.clientHeight;
    this.camera.left = (CAMERA_SIZE * aspect) / -2;
    this.camera.right = (CAMERA_SIZE * aspect) / 2;
    this.camera.updateProjectionMatrix();
  }
}


