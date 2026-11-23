import * as T from "./vendor/three.js";
import { collection } from "./catalog.js";
import { arena } from "./world.js";
import { Player } from "./player.js";
import { View } from "./view.js";
import { $, settings, bindings, mobile, menu, setupUI, choose } from "./ui.js";
function startRenderer() {
  try {
    return new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    $("hint").textContent =
      "Для арены нужен WebGL. Включи аппаратное ускорение в браузере и обнови страницу.";
    $("play").disabled = true;
    document.querySelector("nav").hidden = true;
    return null;
  }
}
const renderer = startRenderer();
if (renderer) startGame(renderer);
function startGame(renderer) {
  renderer.autoClear = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  document.body.prepend(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color("#abcbd5");
  scene.fog = new T.FogExp2("#cfcebb", 0.009);
  const camera = new T.PerspectiveCamera(77, 1, 0.06, 420);
  camera.rotation.order = "YXZ";
  scene.add(new T.HemisphereLight(0xfff4dc, 0x877662, 2));
  const sun = new T.DirectionalLight(0xffe4ba, 2.65);
  sun.position.set(-48, 85, 33);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -100,
    right: 100,
    top: 100,
    bottom: -100,
  });
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const solids = arena(scene),
    player = new Player(solids),
    view = new View(renderer);
  let selected = 0,
    active = false,
    sprint = false,
    clock = 0,
    acc = 0,
    joyX = 0,
    joyY = 0,
    deltaX = 0,
    deltaY = 0,
    queuedJump = false;
  const held = new Set(),
    touchHeld = new Set();
  function configure() {
    const quality = settings.quality;
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        quality === "high" ? 1.75 : quality === "medium" ? 1.25 : 1,
      ),
    );
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = quality !== "low";
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const size = quality === "high" ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== size) {
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      sun.shadow.mapSize.set(size, size);
    }
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    camera.aspect = innerWidth / innerHeight;
    camera.fov = settings.fov;
    camera.updateProjectionMatrix();
    $("touch").style.setProperty("--button", settings.button + "px");
  }
  function select(i) {
    selected = (i + collection.length) % collection.length;
    view.select(collection[selected]);
    choose(selected);
  }
  setupUI(select, configure);
  configure();
  select(0);
  menu("home");
  function pause(tab = "home") {
    active = false;
    held.clear();
    touchHeld.clear();
    joyX = joyY = 0;
    queuedJump = false;
    lookId = stickId = null;
    $("stick").firstElementChild.style.transform = "";
    if (document.pointerLockElement) document.exitPointerLock();
    menu(tab);
  }
  function begin() {
    active = true;
    $("cover").hidden = true;
    document.body.classList.remove("menu");
    $("touch").hidden = !mobile;
    if (!mobile) renderer.domElement.requestPointerLock?.()?.catch(() => {});
  }
  $("play").onclick = $("resume").onclick = begin;
  $("pauseTouch").onclick = () => pause();
  function trigger(action) {
    if (action === "run") {
      sprint = !sprint;
      document
        .querySelector("[data-act=run]")
        .classList.toggle("active", sprint);
    }
    if (action === "inspect" || action === "trick")
      view.play(action === "inspect" ? "Inspect" : "Trick");
    if (action === "jump") queuedJump = true;
    if (action === "inventory" || action === "pause")
      pause(action === "inventory" ? "inventory" : "home");
    if (action?.startsWith("slot")) select(Number(action.slice(4)) - 1);
  }
  addEventListener("keydown", (e) => {
    if (!active) return;
    const action = Object.keys(bindings).find((k) => bindings[k] === e.code);
    if (action) {
      e.preventDefault();
      held.add(e.code);
      if (!e.repeat) trigger(action);
    }
  });
  addEventListener("keyup", (e) => held.delete(e.code));
  addEventListener("blur", () => {
    if (active) pause();
  });
  document.addEventListener("pointerlockchange", () => {
    if (active && !mobile && !document.pointerLockElement) pause();
  });
  function look(x, y, k) {
    const scale = (k * settings.sensitivity) / 100;
    player.yaw -= x * scale;
    player.pitch = T.MathUtils.clamp(player.pitch - y * scale, -1.43, 1.43);
    deltaX += x * scale;
    deltaY += y * scale;
  }
  addEventListener("mousemove", (e) => {
    if (active && document.pointerLockElement)
      look(e.movementX, e.movementY, 0.0022);
  });
  renderer.domElement.onwheel = (e) => {
    if (active) {
      e.preventDefault();
      select(selected + Math.sign(e.deltaY));
    }
  };
  renderer.domElement.onmousedown = (e) => {
    if (active && !mobile && e.button === 0) view.play("Slash");
  };
  let lookId = null,
    stickId = null,
    lastX = 0,
    lastY = 0;
  const screen = renderer.domElement,
    stick = $("stick");
  screen.onpointerdown = (e) => {
    if (active && mobile && lookId === null && e.clientX > innerWidth * 0.35) {
      lookId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      screen.setPointerCapture(lookId);
    }
  };
  screen.onpointermove = (e) => {
    if (e.pointerId === lookId) {
      look(e.clientX - lastX, e.clientY - lastY, 0.0045);
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };
  screen.onlostpointercapture = (e) => {
    if (e.pointerId === lookId) lookId = null;
  };
  function drag(e) {
    const r = stick.getBoundingClientRect(),
      x = (e.clientX - r.left - r.width / 2) / (r.width * 0.4),
      y = (e.clientY - r.top - r.height / 2) / (r.height * 0.4),
      k = Math.max(1, Math.hypot(x, y));
    joyX = x / k;
    joyY = y / k;
    stick.firstElementChild.style.transform =
      "translate(" +
      joyX * r.width * 0.33 +
      "px," +
      joyY * r.height * 0.33 +
      "px)";
  }
  stick.onpointerdown = (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    stick.setPointerCapture(stickId);
    drag(e);
  };
  stick.onpointermove = (e) => {
    if (stickId === e.pointerId) drag(e);
  };
  stick.onlostpointercapture = () => {
    stickId = null;
    joyX = joyY = 0;
    stick.firstElementChild.style.transform = "";
  };
  document.querySelectorAll("[data-act]").forEach((b) => {
    const a = b.dataset.act;
    b.onpointerdown = (e) => {
      if (!active) return;
      b.setPointerCapture(e.pointerId);
      touchHeld.add(a);
      trigger(a);
    };
    b.onlostpointercapture = () => touchHeld.delete(a);
  });
  const down = (k) => held.has(bindings[k]) || touchHeld.has(k);
  const ctx = $("radar").getContext("2d");
  function radar() {
    ctx.fillStyle = "#29312c";
    ctx.fillRect(0, 0, 160, 160);
    ctx.save();
    ctx.translate(80, 80);
    ctx.rotate(player.yaw);
    ctx.scale(1.35, 1.35);
    ctx.translate(-player.p.x, -player.p.z);
    ctx.fillStyle = "#acaa95";
    for (const s of solids)
      if (s.h > 6) ctx.fillRect(s.x - s.w / 2, s.z - s.d / 2, s.w, s.d);
    ctx.restore();
    ctx.fillStyle = "#ffce77";
    ctx.beginPath();
    ctx.moveTo(80, 72);
    ctx.lineTo(75, 85);
    ctx.lineTo(85, 85);
    ctx.fill();
  }
  let last = performance.now(),
    hud = 0,
    frames = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const real = Math.max(0, (now - last) / 1000),
      dt = Math.min(0.25, real);
    last = now;
    if (active) {
      clock += real;
      acc += dt;
      const input = {
        forward: Number(down("forward")) - Number(down("back")) - joyY,
        side: Number(down("right")) - Number(down("left")) + joyX,
        duck: down("duck"),
        walk: down("walk"),
        jump: down("jump") || queuedJump,
        run: sprint,
      };
      while (acc >= 1 / 120) {
        player.tick(1 / 120, input);
        queuedJump = false;
        input.jump = down("jump");
        acc -= 1 / 120;
      }
    }
    const speed = player.speed || 0;
    camera.position.copy(player.p);
    camera.position.y +=
      player.height -
      player.impact +
      (player.ground
        ? Math.sin(player.step * 3.1) * Math.min(0.024, speed * 0.0025)
        : 0);
    camera.rotation.set(player.pitch, player.yaw, 0);
    view.update(dt, {
      speed: active ? speed : 0,
      ground: player.ground,
      vY: player.v.y,
      crouch: down("duck"),
      sprint,
      dx: deltaX,
      dy: deltaY,
      motion: settings.motion,
      fov: settings.weaponFov,
      aspect: camera.aspect,
    });
    deltaX = deltaY = 0;
    renderer.clear();
    renderer.render(scene, camera);
    view.render(renderer);
    frames++;
    hud += real;
    if (hud >= 0.25) {
      $("fps").textContent = Math.round(frames / hud) + " FPS";
      frames = hud = 0;
      $("speed").textContent = String(Math.round(speed * 50)).padStart(3, "0");
      $("state").textContent = !player.ground
        ? "AIR"
        : down("duck")
          ? "CROUCH"
          : sprint
            ? "SPRINT"
            : "GROUND";
      $("timer").textContent = [Math.floor(clock / 60), Math.floor(clock) % 60]
        .map((v) => String(v).padStart(2, "0"))
        .join(":");
      radar();
    }
  }
  addEventListener("resize", configure);
  requestAnimationFrame(loop);
}
