import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, player, enemy, actionButton, controls;
let isJumping = false;
const jumpHeight = 2;
const jumpDuration = 500; // ミリ秒

function init() {
  // シーン、カメラ、レンダラーの設定
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Skyboxの追加
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    './skybox/right.jpg',
    './skybox/left.jpg',
    './skybox/top.jpg',
    './skybox/bottom.jpg',
    './skybox/front.jpg',
    './skybox/back.jpg'
  ]);
  scene.background = texture;

  // ライトの追加
  const light = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 0);
  scene.add(directionalLight);

  // プレイヤーモデルの読み込み
  const gltfLoader = new GLTFLoader();
  gltfLoader.load('human.glb', (gltf) => {
    player = gltf.scene;
    player.position.set(0, -1.8, 0);
    // player.rotation.y = Math.PI / 2; // プレイヤーを左向きにする
    player.rotation.y = 0; // プレイヤーを真正面にする
    scene.add(player);
  });

  // 敵の作成（簡単な立方体）
  // const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
  // const enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  // enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
  // enemy.position.set(3, 0, 0);
  // scene.add(enemy);

  // カメラの位置設定
  camera.position.set(0, -0.1, 2);

  // OrbitControlsの追加
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0); // プレイヤーの位置（または中心点）を設定
  controls.enableDamping = true; // スムーズな動きを有効化
  controls.dampingFactor = 0.05;
  controls.autoRotate = true; // 自動回転を有効化
  controls.autoRotateSpeed = 1.0; // 回転速度（デフォルトは2.0）

  // アクションボタンの作成
  // actionButton = document.createElement('button');
  // actionButton.textContent = 'Jump';
  // actionButton.style.position = 'absolute';
  // actionButton.style.bottom = '20px';
  // actionButton.style.left = '50%';
  // actionButton.style.transform = 'translateX(-50%)';
  // actionButton.id = "actionButton"
  // document.body.appendChild(actionButton);

  // actionButton.addEventListener('click', jump);
}

// 他の関数（onKeyDown, attackEnemy, jump, animate）は変更なし
function onKeyDown(event) {
  if (event.code === 'Space') {
    jump();
  }
}

function attackEnemy() {
  if (enemy.visible) {
    enemy.visible = false;
    setTimeout(() => {
      enemy.visible = true;
    }, 2000);
  }
}

function jump() {
  if (!isJumping && player) {
    isJumping = true;
    const startY = player.position.y;
    const startTime = Date.now();

    function animateJump() {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / jumpDuration, 1);
      
      // ジャンプの高さを計算（放物線を描くように）
      const height = jumpHeight * Math.sin(progress * Math.PI);
      player.position.y = startY + height;

      if (progress < 1) {
        requestAnimationFrame(animateJump);
      } else {
        player.position.y = startY;
        isJumping = false;
      }
    }

    animateJump();
  }
}

function animate() {
  requestAnimationFrame(animate);

  // コントロールを更新
  controls.update();

  // プレイヤーの位置をカメラの中心に設定
  if (player) {
    controls.target.copy(player.position);
  }

  renderer.render(scene, camera);
}

init();
animate();
