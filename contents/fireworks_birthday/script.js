const container = document.getElementById('fireworks-container');
const fireworks = [];
const numFireworks = 473; // 花火の数
const particleImage = new Image();
particleImage.src = 'particle.png'; // 粒子画像のパス

function createFirework() {
    const firework = document.createElement('div');
    firework.className = 'firework';
    container.appendChild(firework);

    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;

    firework.style.left = x + 'px';
    firework.style.top = '0px';

    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
    const numParticles = 11; // 花火の粒の数

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('img');
        particle.src = particleImage.src;
        particle.className = 'particle';
        container.appendChild(particle);

        particle.style.position = 'absolute'; // 絶対配置
        particle.style.left = x + 'px';
        particle.style.bottom = '0px';
        particle.style.width = '47px'; // 画像サイズ調整
        particle.style.height = '47px';

        const angle = Math.random() * 360;
        const speed = Math.random() * 5 + 2;
        const vx = Math.cos(angle * Math.PI / 180) * speed;
        const vy = -Math.sin(angle * Math.PI / 180) * speed;

        animateParticle(particle, vx, vy, x, y);
    }

    setTimeout(() => {
        container.removeChild(firework);
    }, 2000); // 2秒後に花火を消す
}

function animateParticle(particle, vx, vy, startX, startY) {
    let x = 0;
    let y = 0;
    const gravity = 0.1;
    let vyAdjusted = vy;
  
    const interval = setInterval(() => {
      x += vx;
      y += vyAdjusted;
      vyAdjusted += gravity;
  
      particle.style.left = (startX + x) + 'px';
      particle.style.top = (startY + y) + 'px';
  
      if (y > window.innerHeight) {
        clearInterval(interval);
      }
    }, 20);
  }
  
document.addEventListener('DOMContentLoaded', function() {
    for (let i = 0; i < numFireworks; i++) {
        setTimeout(createFirework, i * 500); // 0.5秒間隔で花火を上げる
    }
});
