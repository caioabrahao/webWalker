let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const speed = 100.0;
let isPaused = false;
let pauseMenu;
let pausePrompt;
let versionText;
let optionsMenu;
let mouseSensitivity = 1.0;
let tempSensitivity = 1.0;
let colliders = [];
const PLAYER_HEIGHT = 10;
const COLLISION_DISTANCE = 2;
let startPrompt;
let canJump = true;
let isJumping = false;
const JUMP_FORCE = 20;
const GRAVITY = 50;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 10;

    // Renderer setup
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls setup
    controls = new THREE.PointerLockControls(camera, document.body);

    // Click to start
    document.addEventListener('click', function() {
        controls.lock();
    });

    // Movement controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Add skybox
    const skyboxLoader = new THREE.CubeTextureLoader();
    const skybox = skyboxLoader.load([
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/px.jpg', // right
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/nx.jpg', // left
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/py.jpg', // top
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/ny.jpg', // bottom
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/pz.jpg', // front
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/cube/skybox/nz.jpg'  // back
    ]);
    scene.background = skybox;

    // Create textured ground
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(25, 25);
    groundTexture.anisotropy = 16;

    const groundMaterial = new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        side: THREE.DoubleSide
    });

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Add various objects to the scene
    addSceneObjects();

    // Improved lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    // Setup pause menu
    setupPauseMenu();

    // Setup HUD elements
    setupHUD();

    startPrompt = document.getElementById('startPrompt');
    
    // Update controls event listeners
    controls.addEventListener('lock', () => {
        pauseMenu.style.display = 'none';
        pausePrompt.style.display = 'block';
        startPrompt.style.display = 'none';  // Hide start prompt when game begins
    });

    controls.addEventListener('unlock', () => {
        if (!isPaused) {
            pauseMenu.style.display = 'none';
        }
        pausePrompt.style.display = 'none';
    });

    // Add this line after creating controls
    Object.defineProperty(controls, 'mouseSensitivity', {
        get: function() {
            return mouseSensitivity;
        },
        set: function(value) {
            mouseSensitivity = value;
            // Update the internal sensitivity of PointerLockControls
            controls.pointerSpeed = value;
        }
    });

    // Uncomment this line to see collision boundaries
    // addCollisionHelpers();
}

function setupPauseMenu() {
    pauseMenu = document.getElementById('pauseMenu');
    optionsMenu = document.getElementById('optionsMenu');

    // Change back to ESC key
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape') {
            togglePause();
        }
        // Add jump with space bar
        if (event.code === 'Space' && canJump && !isPaused && controls.isLocked) {
            velocity.y = JUMP_FORCE;
            canJump = false;
            isJumping = true;
        }
    });

    // Setup button listeners
    document.getElementById('resumeButton').addEventListener('click', () => {
        togglePause();
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        resetGame();
    });

    document.getElementById('settingsButton').addEventListener('click', () => {
        showOptionsMenu();
    });

    document.getElementById('quitButton').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja sair?')) {
            location.reload();
        }
    });

    // Options menu listeners
    document.getElementById('sensitivity').addEventListener('input', (e) => {
        tempSensitivity = parseFloat(e.target.value);
        document.getElementById('sensitivityValue').textContent = tempSensitivity.toFixed(1);
    });

    document.getElementById('saveOptionsButton').addEventListener('click', () => {
        mouseSensitivity = tempSensitivity;
        hideOptionsMenu();
    });

    document.getElementById('cancelOptionsButton').addEventListener('click', () => {
        // Reset the slider to the current sensitivity
        document.getElementById('sensitivity').value = mouseSensitivity;
        document.getElementById('sensitivityValue').textContent = mouseSensitivity.toFixed(1);
        hideOptionsMenu();
    });
}

function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        controls.unlock();
        pauseMenu.style.display = 'block';
        optionsMenu.style.display = 'none'; // Ensure options menu is hidden
    } else {
        controls.lock();
        pauseMenu.style.display = 'none';
        optionsMenu.style.display = 'none';
    }
}

function resetGame() {
    // Reset player position
    camera.position.set(0, 10, 0);
    camera.rotation.set(0, 0, 0);
    
    // Reset movement flags
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    
    // Unpause
    togglePause();
}

function addSceneObjects() {
    // Add some cubes
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    
    const positions = [
        { x: 20, y: 5, z: -20 },
        { x: -30, y: 5, z: 30 },
        { x: 40, y: 5, z: 40 }
    ];

    // Modify how we create objects to add them to colliders array
    const createCollider = (mesh) => {
        colliders.push(mesh);
        scene.add(mesh);
    };

    positions.forEach(pos => {
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(pos.x, pos.y, pos.z);
        createCollider(cube);
    });

    // Add some spheres
    const sphereGeometry = new THREE.SphereGeometry(6, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    const spherePositions = [
        { x: -20, y: 6, z: 20 },
        { x: 50, y: 6, z: -30 }
    ];

    spherePositions.forEach(pos => {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(pos.x, pos.y, pos.z);
        createCollider(sphere);
    });

    // Add a pyramid (cone)
    const coneGeometry = new THREE.ConeGeometry(8, 15, 4);
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.set(0, 7.5, -40);
    createCollider(cone);

    // Add a torus (donut)
    const torusGeometry = new THREE.TorusGeometry(10, 3, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.set(-40, 10, -20);
    torus.rotation.x = Math.PI / 2;
    createCollider(torus);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function update(deltaTime) {
    if (controls.isLocked && !isPaused) {
        // Existing horizontal movement
        velocity.x = 0;
        velocity.z = 0;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * deltaTime;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * deltaTime;

        // Apply gravity and jumping
        velocity.y -= GRAVITY * deltaTime;

        // Create movement vector including vertical movement
        const moveVector = new THREE.Vector3(-velocity.x, velocity.y * deltaTime, -velocity.z);
        
        // Check for collisions and adjust movement
        const adjustedMove = checkCollisions(moveVector);

        // Apply adjusted movement
        controls.moveRight(adjustedMove.x);
        controls.moveForward(adjustedMove.z);
        
        // Apply vertical movement
        camera.position.y += adjustedMove.y;

        // Ground check
        const raycaster = new THREE.Raycaster();
        const pos = camera.position.clone();
        raycaster.set(pos, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(colliders);
        
        // Also check ground plane
        raycaster.ray.intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
            new THREE.Vector3()
        );

        if (camera.position.y <= PLAYER_HEIGHT || intersects.length > 0) {
            if (isJumping) {
                isJumping = false;
                canJump = true;
            }
            camera.position.y = Math.max(PLAYER_HEIGHT, camera.position.y);
            velocity.y = 0;
        }
    }

    // Update rotating objects even when paused
    scene.traverse((object) => {
        if (object.geometry && object.geometry.type === 'TorusGeometry') {
            object.rotation.z += 0.01;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!isPaused) {
        update(0.016);
    }
    
    renderer.render(scene, camera);
}

function setupHUD() {
    pausePrompt = document.getElementById('pausePrompt');
    versionText = document.getElementById('versionText');
}

function showOptionsMenu() {
    pauseMenu.style.display = 'none';
    optionsMenu.style.display = 'block';
    // Set the slider to current sensitivity
    document.getElementById('sensitivity').value = mouseSensitivity;
    document.getElementById('sensitivityValue').textContent = mouseSensitivity.toFixed(1);
}

function hideOptionsMenu() {
    optionsMenu.style.display = 'none';
    pauseMenu.style.display = 'block';
}

function checkCollisions(moveVector) {
    // Create raycasters for each direction
    const directions = [
        new THREE.Vector3(1, 0, 0),   // right
        new THREE.Vector3(-1, 0, 0),  // left
        new THREE.Vector3(0, 0, 1),   // front
        new THREE.Vector3(0, 0, -1),  // back
    ];

    const raycaster = new THREE.Raycaster();
    const cameraPosition = camera.position.clone();
    
    // Adjust raycast origin to be at the center of the player
    cameraPosition.y -= PLAYER_HEIGHT / 2;

    for (let direction of directions) {
        // Rotate direction based on camera's rotation
        direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
        raycaster.set(cameraPosition, direction);

        const intersects = raycaster.intersectObjects(colliders);
        
        if (intersects.length > 0 && intersects[0].distance < COLLISION_DISTANCE) {
            // If there's a collision, prevent movement in that direction
            if (intersects[0].distance < COLLISION_DISTANCE) {
                const collisionNormal = intersects[0].face.normal;
                const dot = moveVector.dot(collisionNormal);
                if (dot < 0) {
                    // Remove the component of movement in the direction of the collision
                    moveVector.sub(collisionNormal.multiplyScalar(dot));
                }
            }
        }
    }

    // Add upward/downward collision detection
    const verticalDirections = [
        new THREE.Vector3(0, 1, 0),   // up
        new THREE.Vector3(0, -1, 0),  // down
    ];

    for (let direction of verticalDirections) {
        raycaster.set(cameraPosition, direction);
        const intersects = raycaster.intersectObjects(colliders);
        
        if (intersects.length > 0 && intersects[0].distance < COLLISION_DISTANCE) {
            if (direction.y === -1) {
                canJump = true;
                isJumping = false;
            }
            moveVector.y = 0;
        }
    }

    return moveVector;
}

// Optional: Add helper function to visualize collision boundaries
function addCollisionHelpers() {
    colliders.forEach(collider => {
        const helper = new THREE.BoxHelper(collider, 0xff0000);
        scene.add(helper);
    });
}

init();
animate(); 