import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, objects = [];
const MAX_OBJECTS = 47;
let controls;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = 5;

  // OrbitControlsの追加
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // スムーズな回転のためのダンピングを有効化
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 1;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2;

  // 光源の追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // 定期的にオブジェクトを生成
  setInterval(spawnObject, 100); // 1秒ごとに生成
}

function spawnObject() {
  const loader = new GLTFLoader();
  loader.load('object.glb', (gltf) => {
    const object = gltf.scene;

    // オブジェクトを反時計回りに90度回転
    object.rotation.y = Math.PI / 2;

    object.position.set(
      Math.random() * 4 - 2,
      Math.random() * 4 - 2,
      Math.random() * 4 - 2
    );

    scene.add(object);
    objects.push(object);

    // 最大数を超えた場合、古いオブジェクトを削除
    if (objects.length > MAX_OBJECTS) {
      const oldestObject = objects.shift();
      scene.remove(oldestObject);
    }

    console.log('Object spawned. Total objects:', objects.length);
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // OrbitControlsの更新
  renderer.render(scene, camera);
}

init();
animate();
