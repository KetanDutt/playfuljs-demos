var CIRCLE = Math.PI * 2;
var MOBILE = matchMedia('(pointer: coarse)').matches;
var muted = false;
var audioCtx = null;

function sound(kind) {
    if (muted) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var now = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var settings = {
        step: [85, 48, 0.045, 0.07, 'triangle'],
        swing: [210, 55, 0.14, 0.16, 'sawtooth'],
        hit: [120, 38, 0.18, 0.12, 'square'],
        hurt: [95, 42, 0.16, 0.2, 'sawtooth'],
        portal: [280, 760, 0.16, 0.45, 'sine']
    }[kind] || [100, 80, 0.05, 0.1, 'sine'];
    osc.type = settings[4];
    osc.frequency.setValueAtTime(settings[0], now);
    osc.frequency.exponentialRampToValueAtTime(settings[1], now + settings[3]);
    gain.gain.setValueAtTime(settings[2], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings[3]);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + settings[3]);
}
function playStepSound() { sound('step'); }
function playSwingSound() { sound('swing'); }

function Controls() {
	this.codes = {
		37: 'left', // left arrow
		39: 'right', // right arrow
		38: 'forward', // up arrow
		40: 'backward', // down arrow
		65: 'left', // a
		68: 'right', // d
		87: 'forward', //w
		83: 'backward', // s
        81: 'left', // q
        69: 'right' // e

	}
	this.states = {
		'left': false,
		'right': false,
		'forward': false,
		'backward': false,
		'running': false
	};
	document.addEventListener('keydown', this.onKey.bind(this, true), false);
	document.addEventListener('keyup', this.onKey.bind(this, false), false);

	document.addEventListener('keydown', function(e){
		if(player && e.keyCode === 73){
			player.cycleWeapons();
		}
	});
    document.addEventListener('mousedown', function(e){
        if (player && e.button === 0 && e.target === display && !isPaused) player.attack();
    });
	//document.addEventListener('touchstart', this.onTouch.bind(this), false);
	//document.addEventListener('touchmove', this.onTouch.bind(this), false);
	//document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
}

//Controls.prototype.onTouch = function(e) {
//  var t = e.touches[0];
//  this.onTouchEnd(e);
//  if (t.pageY < window.innerHeight * 0.5) this.onKey(true, { keyCode: 38 });
//  else if (t.pageX < window.innerWidth * 0.5) this.onKey(true, { keyCode: 37 });
//  else if (t.pageY > window.innerWidth * 0.5) this.onKey(true, { keyCode: 39 });
//};
//
//Controls.prototype.onTouchEnd = function(e) {
//  this.states = { 'left': false, 'right': false, 'forward': false, 'backward': false };
//  e.preventDefault();
//  e.stopPropagation();
//};

Controls.prototype.onKey = function(val, e) {

	var state = this.codes[e.keyCode];

	this.states.running = e.shiftKey;

	if (typeof state === 'undefined') return;
	this.states[state] = val;
	//this.states.crouching = e.ctrlKey;
	e.preventDefault && e.preventDefault();
	e.stopPropagation && e.stopPropagation();
};


Controls.prototype.onMouse = function(player,vals){
	var maxSpeed = 1000, // fastest possible mouse speed
			speed = Math.max(-maxSpeed, Math.min(vals.x, maxSpeed)) / maxSpeed,
			amount = Math.PI * speed;

	if(player.direction > CIRCLE){
		amount -= CIRCLE;
	} else if(player.direction < 0){
		amount += CIRCLE;
	}

	player.direction += amount;

};

var imageCache = Object.create(null);
function Bitmap(src, width, height) {
    this.image = imageCache[src] || (imageCache[src] = new Image());
    if (!this.image.src) this.image.src = src;
    this.width = width;
    this.height = height;
}

function Player(x, y, direction) {
	this.x = x;
	this.y = y;
	this.direction = direction;
	this.maxStamina = 10;
	this.stamina = this.maxStamina;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.damageIndicators = [];
    this.attackTime = 0;
    this.hitFlash = 0;
	this.inventory = [
		new Bitmap('img/goo_hand.png', 320, 332),
		new Bitmap('img/knife_hand.png', 319, 320)
	];
	this.weapon = this.inventory[0];

	this.paces = 0;
}

Player.prototype.takeDamage = function(amount, angle) {
    this.health -= amount;
    this.hitFlash = 0.35;
    sound('hurt');
    this.damageIndicators.push({ angle: angle, time: 1.0 });

    // Play a hurt sound here if we wanted
    if (this.health <= 0) {
        this.health = this.maxHealth;
        showToast('You were overwhelmed — maze reset');
        generateLevel(true); // Restart level on death
    }
};

Player.prototype.rotate = function(angle) {
	this.direction = (this.direction + angle + CIRCLE) % (CIRCLE);
};

Player.prototype.walk = function(distance, angle, map) {
	var dx = Math.cos(this.direction + angle) * distance;
	var dy = Math.sin(this.direction + angle) * distance;
	if (map.get(this.x + dx, this.y) <= 0) this.x += dx;
	if (map.get(this.x, this.y + dy) <= 0) this.y += dy;

    var oldPaces = this.paces;
	this.paces += distance;
    if (Math.floor(oldPaces * 2) !== Math.floor(this.paces * 2)) {
        playStepSound();
    }
};

Player.prototype.attack = function() {
    if (this.attackTime > 0) return;
    this.attackTime = 0.2;
    playSwingSound();

    for (var i = 0; i < map.objects.length; i++) {
        var obj = map.objects[i];
        if (obj && obj.isEnemy && !obj.dead) {
            var dx = obj.x - this.x;
            var dy = obj.y - this.y;
            var dist = Math.sqrt(dx*dx + dy*dy);

            // Calculate angle to enemy to ensure they are somewhat in front
            var angleToEnemy = Math.atan2(dy, dx);
            var angleDiff = Math.abs(this.direction - angleToEnemy);
            // Normalize angle diff
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            angleDiff = Math.abs(angleDiff);

            if (dist < 2.5 && angleDiff < Math.PI / 4) {
                obj.dead = true;
                player.kills++;
                player.hitFlash = -0.18;
                sound('hit');
                showToast('Enemy down');
            }
        }
    }
}

Player.prototype.update = function(controls, map, seconds) {

	var speed = controls.running && this.stamina > 0 ? 3.2 : 1.55;

	if (controls.forward) this.walk(speed * seconds, 0,map);
	if (controls.backward) this.walk(-speed * seconds, 0,map);

	if(!document.pointerLockElement){
		if (controls.left) this.rotate(-Math.PI * seconds);
		if (controls.right) this.rotate(Math.PI * seconds);
	} else {
		if (controls.left) this.walk(-speed / 2 * seconds, Math.PI * .5, map);
		if (controls.right) this.walk(speed / 2 * seconds, Math.PI * .5 ,map);
	}

    var moving = controls.forward || controls.backward || controls.left || controls.right;
    if (controls.running && moving && this.stamina > 0) this.stamina = Math.max(0, this.stamina - 2.8 * seconds);
    else this.stamina = Math.min(this.maxStamina, this.stamina + 1.4 * seconds);
    this.hitFlash += (0 - this.hitFlash) * Math.min(1, seconds * 9);

    if (this.attackTime > 0) {
        this.attackTime = Math.max(0, this.attackTime - seconds);
    }

    // Tick down damage indicators
    for (var i = this.damageIndicators.length - 1; i >= 0; i--) {
        this.damageIndicators[i].time -= seconds;
        if (this.damageIndicators[i].time <= 0) {
            this.damageIndicators.splice(i, 1);
        }
    }

    // Check for exit
    for (var i = 0; i < map.objects.length; i++) {
        var obj = map.objects[i];
        if (obj && obj.isExit) {
            var dx = obj.x - this.x;
            var dy = obj.y - this.y;
            if (Math.sqrt(dx*dx + dy*dy) < 1) {
                sound('portal');
                player.level++;
                showToast('Maze escaped — entering level ' + player.level);
                generateLevel();
                break;
            }
        }
    }
};

Player.prototype.cycleWeapons = function(){
	this.weapon = this.inventory[this.inventory.indexOf(this.weapon) + 1] || this.inventory[0];
}

function Map(size) {
	this.size = size;
	this.wallGrid = new Uint8Array(size * size);
	this.skybox = new Bitmap('img/deathvalley_panorama.jpg', 4000, 1290);
	this.wallTexture = new Bitmap('img/wall_texture.jpg', 1024, 1024);
	this.light = 0;
	this.objects = [];
    this.generation = 0;
}

Map.prototype.get = function(x, y) {
	x = Math.floor(x);
	y = Math.floor(y);
	if (x < 0 || x > this.size - 1 || y < 0 || y > this.size - 1) return -1;
	return this.wallGrid[y * this.size + x];
};

Map.prototype.getObject = function(x,y) {
	x = Math.floor(x);
	y = Math.floor(y);
	return this.objects[y * this.size + x];
};

Map.prototype.randomize = function() {
	for (var i = 0; i < this.size * this.size; i++) {
		this.wallGrid[i] = Math.random() < 0.3 ? 1 : 0;
	}
};

Map.prototype.cast = function(point, angle, range, objects) {
	var self = this,
		sin = Math.sin(angle),
		cos = Math.cos(angle),
		noWall = {
			length2: Infinity
		};

	return ray({
		x: point.x,
		y: point.y,
		height: 0,
		distance: 0
	});

	function ray(origin) {
		var stepX = step(sin, cos, origin.x, origin.y);
		var stepY = step(cos, sin, origin.y, origin.x, true);
		var nextStep = stepX.length2 < stepY.length2 ? inspect(stepX, 1, 0, origin.distance, stepX.y) : inspect(stepY, 0, 1, origin.distance, stepY.x);

		if (nextStep.distance > range) return [origin];
		return [origin].concat(ray(nextStep));
	}

	function step(rise, run, x, y, inverted) {
		if (run === 0) return noWall;
		var dx = run > 0 ? Math.floor(x + 1) - x : Math.ceil(x - 1) - x;
		var dy = dx * (rise / run);
		return {
			x: inverted ? y + dy : x + dx,
			y: inverted ? x + dx : y + dy,
			length2: dx * dx + dy * dy
		};
	}

	function inspect(step, shiftX, shiftY, distance, offset) {
		var dx = cos < 0 ? shiftX : 0;
		var dy = sin < 0 ? shiftY : 0;
		step.height = self.get(step.x - dx, step.y - dy);
		step.distance = distance + Math.sqrt(step.length2);
		step.object = self.getObject(step.x - dx, step.y - dy);
		if (shiftX) step.shading = cos < 0 ? 2 : 0;
		else step.shading = sin < 0 ? 2 : 1;
		step.offset = offset - Math.floor(offset);
		return step;
	}
};

Map.prototype.update = function(seconds) {
	if (this.light > 0) this.light = Math.max(this.light - 10 * seconds, 0);
	else if (Math.random() * 5 < seconds) this.light = 2;
};

Map.prototype.addObject = function(object,x,y){
	this.objects.push( new MapObject(object,x,y) );
};

function MapObject(object,x,y){
	for(var prop in object){
		this[prop] = object[prop];
	}
	this.x = x;
	this.y = y;
}

function Camera(canvas, resolution, fov) {
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = Math.round(this.width * this.pixelRatio);
    canvas.height = Math.round(this.height * this.pixelRatio);
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
	this.resolution = resolution;
	this.spacing = this.width / resolution;
	this.fov = fov;
	this.range = MOBILE ? 8 : 14;
	this.lightRange = 5;
	this.scale = (this.width + this.height) / 1200;


}

Camera.prototype.onKey = function(val,e){
	if(e.keyCode === 70){
		this.toggleFullscreen();
	}
}

Camera.prototype.render = function(player, map, objects) {
    if (player.attackTime > 0) {
        this.ctx.save();
        var shakeX = (Math.random() - 0.5) * 10 * (player.attackTime / 0.2);
        var shakeY = (Math.random() - 0.5) * 10 * (player.attackTime / 0.2);
        this.ctx.translate(shakeX, shakeY);
    }

	this.drawSky(player.direction, map.skybox, map.light);
	this.drawColumns(player, map, objects);
	this.drawWeapon(player);
	this.drawMiniMap(map, player);
    this.drawHUD(player);

    if (player.attackTime > 0) {
        this.ctx.restore();
    }
};

Camera.prototype.drawHUD = function(player) {
    var ctx = this.ctx;
    var compact = this.width < 600;
    var x = 20, y = this.height - (compact ? 68 : 76), w = compact ? 130 : 190;
    function bar(label, value, max, color, offset) {
        ctx.fillStyle = 'rgba(4,6,10,.62)'; ctx.fillRect(x, y + offset, w, 13);
        ctx.fillStyle = color; ctx.fillRect(x, y + offset, w * Math.max(0, value / max), 13);
        ctx.fillStyle = '#fff'; ctx.font = '700 10px ui-monospace, monospace'; ctx.textAlign = 'left';
        ctx.fillText(label, x, y + offset - 5);
    }
    ctx.save();
    bar('HEALTH ' + Math.ceil(player.health), player.health, player.maxHealth, '#ef4f5f', 0);
    bar('STAMINA', player.stamina, player.maxStamina, '#65e0bd', 34);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.fillText('LEVEL ' + player.level + '  ·  ' + player.kills + ' KILLS  ·  FIND THE GOLD BEACON', this.width / 2, 28);
    if (player.hitFlash) {
        ctx.fillStyle = player.hitFlash > 0 ? 'rgba(255,20,35,' + Math.abs(player.hitFlash) + ')' : 'rgba(255,220,90,' + Math.abs(player.hitFlash) + ')';
        ctx.fillRect(0, 0, this.width, this.height);
    }
    for (var i = 0; i < player.damageIndicators.length; i++) {
        var indicator = player.damageIndicators[i], rel = indicator.angle - player.direction;
        ctx.save(); ctx.translate(this.width / 2, this.height / 2); ctx.rotate(rel);
        ctx.fillStyle = 'rgba(255,35,45,' + Math.max(0, indicator.time) + ')';
        ctx.beginPath(); ctx.moveTo(0,-Math.min(this.width,this.height)*.38); ctx.lineTo(-12,-Math.min(this.width,this.height)*.34); ctx.lineTo(12,-Math.min(this.width,this.height)*.34); ctx.fill(); ctx.restore();
    }
    ctx.restore();
};

Camera.prototype.drawSky = function(direction, sky, ambient) {
	var width = this.width * (CIRCLE / this.fov);
	var left = -width * direction / CIRCLE;

	this.ctx.save();
	this.ctx.drawImage(sky.image, left, 0, width, this.height);
	if (left < width - this.width) {
		this.ctx.drawImage(sky.image, left + width, 0, width, this.height);
	}
	if (ambient > 0) {
		this.ctx.fillStyle = '#ffffff';
		this.ctx.globalAlpha = ambient * 0.1;
		this.ctx.fillRect(0, this.height * 0.5, this.width, this.height * 0.5);
	}
	this.ctx.restore();
};

Camera.prototype.drawSpriteColumn = function(player,map,column,columnProps,sprites) {

	var ctx = this.ctx,
		left = Math.floor(column * this.spacing),
		width = Math.ceil(this.spacing),
		angle = this.fov * (column / this.resolution - 0.5),
		columnWidth = this.width / this.resolution,
		sprite,props,obj,textureX,height,projection, mappedColumnObj,spriteIsInColumn,top;

	//todo: make rays check for objects, and return those that it actually hit

	//check if ray hit an object
	//if(!columnProps.objects.length){return;}

	sprites = sprites.filter(function(sprite){
	 return !columnProps.hit || sprite.distanceFromPlayer < columnProps.hit;
	});


	for(var i = 0; i < sprites.length; i++){
		sprite = sprites[i];

		//mappedColumnObj = columnProps.objects.filter(function(obj){
		//	return sprite === obj.object;
		//})[0];

		//if(!mappedColumnObj)return;

		//determine if sprite should be drawn based on current column position and sprite width
		spriteIsInColumn =  left > sprite.render.cameraXOffset - ( sprite.render.width / 2 ) && left < sprite.render.cameraXOffset + ( sprite.render.width / 2 );

		//console.log(spriteIsInColumn);

		if(spriteIsInColumn){
			textureX = Math.floor( sprite.texture.width / sprite.render.numColumns * ( column - sprite.render.firstColumn ) );

			this.ctx.fillStyle = 'black';
			this.ctx.globalAlpha = 1;
			//ctx.fillRect(left, top , 10, sprite.render.height);

			var brightness = Math.max(sprite.distanceFromPlayer / this.lightRange - map.light, 0) * 100;

            ctx.drawImage(sprite.texture.image, textureX, 0, 1, sprite.texture.height, left, sprite.render.top, width, sprite.render.height);
            ctx.fillStyle = '#05070a';
            ctx.globalAlpha = Math.min(0.82, brightness / 125);
            ctx.fillRect(left, sprite.render.top, width, sprite.render.height);
            ctx.globalAlpha = 1;





			//debugger;

			//ctx.fillRect(left, sprite.render.top, columnWidth, sprite.render.height);
			//debugger;

		}


	};

};

Camera.prototype.drawSprites = function(player,map,columnProps){

	var screenWidth = this.width,
		screenHeight = this.height,
		screenRatio = screenWidth / this.fov,
		resolution = this.resolution;

	//probably should get these and pass them in, but modifying originals for now
	// also this limits size of world

	// calculate each sprite distance to player
	this.setSpriteDistances(map.objects, player);


	var sprites = Array.prototype.slice.call(map.objects)
        .filter(function(sprite) { return sprite && (!sprite.dead || sprite.height > 0.1); })
		.map(function(sprite){

			var distX = sprite.x - player.x,
				distY = sprite.y - player.y,
                distance = Math.max(0.1, Math.sqrt(distX * distX + distY * distY)),
				width = sprite.width * screenWidth / distance,
				height = sprite.height * screenHeight / distance,
				renderedFloorOffset = sprite.floorOffset / distance,
				angleToPlayer = Math.atan2(distY,distX),
				angleRelativeToPlayerView = player.direction - angleToPlayer,
				top = (screenHeight / 2) * (1 + 1 / distance) - height;

			if(angleRelativeToPlayerView >= CIRCLE / 2){
				angleRelativeToPlayerView -= CIRCLE;
			}

			var cameraXOffset = ( screenWidth / 2 ) - (screenRatio * angleRelativeToPlayerView),
				numColumns = width / screenWidth * resolution,
				firstColumn = Math.floor( (cameraXOffset - width/2 ) / screenWidth * resolution);

            sprite.distanceFromPlayer = distance;
			sprite.render = {
				width: width,
				height: height,
				angleToPlayer: angleRelativeToPlayerView,
				cameraXOffset: cameraXOffset,
				distanceFromPlayer: sprite.distanceFromPlayer,
				numColumns: numColumns,
				firstColumn: firstColumn,
				top: top
			};

			// temp render red dot at item position
			//camera.ctx.fillStyle = 'red';
			//camera.ctx.fillRect(sprite.render.cameraXOffset, camera.height / 2, 3, 3);

			return sprite;
		})
		// sort sprites in distance order
		.sort(function(a,b){
			if(a.distanceFromPlayer < b.distanceFromPlayer){
				return 1;
			}
			if(a.distanceFromPlayer > b.distanceFromPlayer){
				return -1;
			}
			return 0;
		});

		if(sprites.length > 1 ){
			//debugger;
		}

	this.ctx.save();
	for (var column = 0; column < this.resolution; column++) {
		this.drawSpriteColumn(player,map,column,columnProps[column], sprites);
	}
	this.ctx.restore();
};

Camera.prototype.setSpriteDistances = function() {};

Camera.prototype.drawColumns = function(player, map, objects) {
	this.ctx.save();
	var allObjects = [];
	for (var column = 0; column < this.resolution; column++) {
		var angle = this.fov * (column / this.resolution - 0.5);
		var ray = map.cast(player, player.direction + angle, this.range);
		var columnProps = this.drawColumn(column, ray, angle, map);

		allObjects.push(columnProps);
	}
	this.ctx.restore();
	this.ctx.save();
	this.drawSprites(player,map,allObjects);
	this.ctx.restore();
};


Camera.prototype.drawWeapon = function(player) {
    var weapon = player.weapon;
    var paces = player.paces;
	var bobX = Math.cos(paces * 2) * this.scale * 6;
	var bobY = Math.sin(paces * 4) * this.scale * 6;

    var attackOffset = 0;
    if (player.attackTime > 0) {
        attackOffset = Math.sin(player.attackTime / 0.2 * Math.PI) * 100 * this.scale;
    }

	var left = this.width * 0.55 + bobX - attackOffset;
	var top = this.height * 0.6 + bobY + attackOffset * 0.5;
	this.ctx.drawImage(weapon.image, left, top, weapon.width * this.scale, weapon.height * this.scale);
};

Camera.prototype.drawMiniMap = function(map, player) {

	var ctx = this.ctx,
		mapWidth = Math.min(190, this.width * (MOBILE ? .28 : .18)),
		mapHeight = mapWidth,
		x = this.width - mapWidth - 20,
		y = 20,
		blockWidth = mapWidth / map.size,
		blockHeight = mapHeight / map.size,
		playerX = player.x / map.size * mapWidth, // coords on map
		playerY = player.y / map.size * mapWidth,
		origFillStyle = ctx.fillStyle,
		wallIndex,
		triangleX = x + playerX,
		triangleY = y + playerY;

	ctx.save();

	ctx.globalAlpha = .3;
	ctx.fillRect(x, y, mapWidth, mapHeight);
	ctx.globalAlpha = .4;

	ctx.fillStyle = '#ffffff';

	for (var row = 0; row < map.size; row++) {
		for (var col = 0; col < map.size; col++) {

			wallIndex = row * map.size + col;

			if (map.wallGrid[wallIndex]) {
				ctx.fillRect(x + (blockWidth * col), y + (blockHeight * row), blockWidth, blockHeight);
			}

		}
	}

	ctx.save();

	for (var i = 0; i < map.objects.length; i++){
		if(map.objects[i] && map.objects[i].isExit){
				ctx.fillStyle = map.objects[i].color || 'blue';
				ctx.globalAlpha = .8;
                // Fix position: map.objects[i].x is world coordinates. We want to center the rect.
                var objWidth = blockWidth;
                var objHeight = blockHeight;
                var objMapX = x + (blockWidth * map.objects[i].x) - objWidth / 2;
                var objMapY = y + (blockHeight * map.objects[i].y) - objHeight / 2;
				ctx.fillRect(objMapX, objMapY, objWidth, objHeight);
		}
	}

	ctx.restore();


	//player triangle
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#FF0000';
	ctx.translate(triangleX,triangleY);

	ctx.rotate(player.direction - Math.PI * .5);
	ctx.beginPath();
	ctx.lineTo(-5, -7); // bottom left of triangle
	ctx.lineTo(0, 5); // tip of triangle
	ctx.lineTo(5, -7); // bottom right of triangle
	ctx.fill();

	ctx.restore();
};

Camera.prototype.drawColumn = function(column, ray, angle, map) {
	var ctx = this.ctx,
		wallTexture = map.wallTexture,
		left = Math.floor(column * this.spacing),
		width = Math.ceil(this.spacing),
		hit = -1,
		objects = [],
		hitDistance;

	while (++hit < ray.length && ray[hit].height <= 0);

	for (var s = ray.length - 1; s >= 0; s--) {
		var step = ray[s];
		var rainDrops = Math.pow(Math.random(), 3) * s;
		var rain = (rainDrops > 0) && this.project(0.1, angle, step.distance),
		textureX,wall;

		if (s === hit) {
			textureX = Math.floor(wallTexture.width * step.offset);
			wall = this.project(step.height, angle, step.distance);

			ctx.globalAlpha = 1;
			ctx.drawImage(wallTexture.image, textureX, 0, 1, wallTexture.height, left, wall.top, width, wall.height);

			ctx.fillStyle = '#000000';
			ctx.globalAlpha = Math.max((step.distance + step.shading) / this.lightRange - map.light, 0);
			ctx.fillRect(left, wall.top, width, wall.height);
			hitDistance = step.distance;
		} else if(step.object){

			objects.push({
				object: step.object,
				distance: step.distance,
				offset: step.offset,
				angle: angle
			});

		}

		//ctx.fillStyle = '#ffffff';
		//ctx.globalAlpha = 0.15;
		//while (--rainDrops > 0) ctx.fillRect(left, Math.random() * rain.top, 1, rain.height);
	}
	return {
		objects: objects,
		hit: hitDistance
	}
};

Camera.prototype.project = function(height, angle, distance) {
	var z = distance * Math.cos(angle);
	var wallHeight = this.height * height / z;
	var bottom = this.height / 2 * (1 + 1 / z);
	return {
		top: bottom - wallHeight,
		height: wallHeight
	};
};

Camera.prototype.projectSprite = function(height, distance) {
	var z = distance;
	var wallHeight = this.height * height / z;
	var bottom = this.height / 2 * (1 + 1 / z);
	return {
		top: bottom - wallHeight,
		height: wallHeight
	};
};

Camera.prototype.toggleFullscreen = function(){
    if (document.pointerLockElement === display) pointerRelease();
    else lockPointer(display, controls.onMouse.bind(controls, player));
};

function GameLoop() {
	this.frame = this.frame.bind(this);
	this.lastTime = 0;
	this.callback = function() {};
}

GameLoop.prototype.start = function(callback) {
	this.callback = callback;
	requestAnimationFrame(this.frame);
};

GameLoop.prototype.frame = function(time) {
	var seconds = (time - this.lastTime) / 1000;
	this.lastTime = time;
    if (seconds < 0.2 && !isPaused) this.callback(seconds);
	requestAnimationFrame(this.frame);
};

function Objects(){
	this.collection = [];
}

Objects.prototype.update = function(seconds){
    var generation = map.generation;
    var aliveObjects = [];
    var spawnCount = 0;
	map.objects.forEach(function(item){
		item.logic && item.logic(seconds);
        if (item.dead && item.height <= 0.1) {
            spawnCount++;
        } else {
            aliveObjects.push(item);
        }
	});
    if (generation !== map.generation) return;
    map.objects = aliveObjects;
    for (var i = 0; i < spawnCount; i++) {
        spawnEnemy();
    }
}

var isPaused = true, toastTimer = 0;
var display = document.getElementById('display'),
	player = new Player(15.5, 15.5, Math.PI * 0.3),
	map = new Map(32),
	objects = new Objects(),
	controls = new Controls(),
	camera = new Camera(display, MOBILE ? 160 : 320, Math.PI * .4),
	loop = new GameLoop();
player.level = 1; player.kills = 0;

function generateLevel(fromDeath) {
    map.generation++;
    if (fromDeath) player.kills = Math.max(0, player.kills - 2);
    player.health = player.maxHealth; player.stamina = player.maxStamina;
    for (var i = 0; i < map.size * map.size; i++) map.wallGrid[i] = 1;
    map.objects = [];

    var stack = [];
    var startX = 1;
    var startY = 1;
    map.wallGrid[startY * map.size + startX] = 0;
    stack.push({x: startX, y: startY});

    var maxDist = 0;
    var endX = 1, endY = 1;

    while (stack.length > 0) {
        var current = stack[stack.length - 1];
        var neighbors = [];
        var dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];

        for (var i = 0; i < dirs.length; i++) {
            var nx = current.x + dirs[i][0];
            var ny = current.y + dirs[i][1];
            if (nx > 0 && nx < map.size - 1 && ny > 0 && ny < map.size - 1) {
                if (map.wallGrid[ny * map.size + nx] === 1) {
                    neighbors.push({x: nx, y: ny, dx: dirs[i][0]/2, dy: dirs[i][1]/2});
                }
            }
        }

        if (neighbors.length > 0) {
            var next = neighbors[Math.floor(Math.random() * neighbors.length)];
            map.wallGrid[(current.y + next.dy) * map.size + (current.x + next.dx)] = 0;
            map.wallGrid[next.y * map.size + next.x] = 0;
            stack.push(next);
            if (stack.length > maxDist) {
                maxDist = stack.length;
                endX = next.x;
                endY = next.y;
            }
        } else {
            stack.pop();
        }
    }

    // Carve a few random loops
    for (var i = 0; i < 20; i++) {
        var rx = Math.floor(Math.random() * (map.size - 2)) + 1;
        var ry = Math.floor(Math.random() * (map.size - 2)) + 1;
        map.wallGrid[ry * map.size + rx] = 0;
    }

    player.x = startX + 0.5;
    player.y = startY + 0.5;

    // Spawn exit object (a golden cowboy acting as a portal)
    map.addObject({
        color: 'gold',
        texture: new Bitmap('img/cowboy.png', 639, 1500),
        height: 1.0,
        width: 0.5,
        floorOffset: 0,
        isExit: true
    }, endX + 0.5, endY + 0.5);

    for (var i = 0; i < 8; i++) spawnEnemy();
}

function spawnEnemy() {
    var spawned = false, attempts = 0;
    while (!spawned && attempts++ < 200) {
        var ex = Math.floor(Math.random() * (map.size - 2)) + 1;
        var ey = Math.floor(Math.random() * (map.size - 2)) + 1;
        if (map.get(ex, ey) === 0 && Math.hypot(ex - player.x, ey - player.y) > 6) {
            map.addObject({
                color: 'brown',
                isEnemy: true,
                texture: new Bitmap('img/cowboy.png', 639, 1500),
                height: .7,
                width: .225,
                floorOffset: 0,
                speed: 1.5,
                logic: badGuyLogic()
            }, ex + 0.5, ey + 0.5);
            spawned = true;
        }
    }
}

generateLevel();

function badGuyLogic(){
    function hasLineOfSight(x1, y1, x2, y2, map) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var dist = Math.sqrt(dx*dx + dy*dy);
        var steps = Math.ceil(dist * 2);
        for (var i = 1; i < steps; i++) {
            var cx = x1 + dx * (i / steps);
            var cy = y1 + dy * (i / steps);
            if (map.get(cx, cy) > 0) return false;
        }
        return true;
    }

	return function(seconds){
		var self = this;

        if (self.dead) {
            if (self.height > 0.1) {
                self.height = Math.max(0.1, self.height - 2 * seconds); // fall over
            }
            return;
        }

        var dx = player.x - self.x;
        var dy = player.y - self.y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        self.distanceFromPlayer = dist;

        if (self.attackCooldown === undefined) self.attackCooldown = 0;
        if (self.attackCooldown > 0) self.attackCooldown -= seconds;

        var pad = 0.3; // padding to prevent walking on walls

		if(dist < 12 && dist > 1.5){
            // Chase
            var angle = Math.atan2(dy, dx);
            var moveX = self.speed * seconds * Math.cos(angle);
            var moveY = self.speed * seconds * Math.sin(angle);
            var signX = moveX > 0 ? pad : -pad;
            var signY = moveY > 0 ? pad : -pad;
            if (map.get(self.x + moveX + signX, self.y) <= 0) self.x += moveX;
            if (map.get(self.x, self.y + moveY + signY) <= 0) self.y += moveY;
		} else if (dist <= 1.5) {
            // Attack!
            if (self.attackCooldown <= 0 && hasLineOfSight(self.x, self.y, player.x, player.y, map)) {
                self.attackCooldown = 1.0; // 1 attack per second
                var angleToPlayer = Math.atan2(-dy, -dx); // Angle FROM player TO enemy
                player.takeDamage(10, angleToPlayer);
            }
        } else if (dist >= 12) {
            // Patrol randomly
            if (self.patrolTimer === undefined || self.patrolTimer <= 0) {
                self.patrolAngle = Math.random() * Math.PI * 2;
                self.patrolTimer = Math.random() * 3 + 1;
            }
            self.patrolTimer -= seconds;
            var moveX = self.speed * 0.5 * seconds * Math.cos(self.patrolAngle);
            var moveY = self.speed * 0.5 * seconds * Math.sin(self.patrolAngle);
            var signX = moveX > 0 ? pad : -pad;
            var signY = moveY > 0 ? pad : -pad;

            var moved = false;
            if (map.get(self.x + moveX + signX, self.y) <= 0) { self.x += moveX; moved = true; }
            if (map.get(self.x, self.y + moveY + signY) <= 0) { self.y += moveY; moved = true; }
            if (!moved) {
                self.patrolTimer = 0; // Turn around if stuck
            }
        }
	};
}

loop.start(function frame(seconds) {
	map.update(seconds);
	objects.update(seconds);
	player.update(controls.states, map, seconds);
	camera.render(player, map, objects);
});
// Resize without registering duplicate keyboard listeners.
var resizeTimer;
window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ camera = new Camera(display, MOBILE ? 150 : Math.min(420, Math.ceil(innerWidth / 4)), Math.PI * .4); }, 100);
});

function showToast(message) {
    var el = document.getElementById('toast');
    el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1800);
}
function setPaused(value) {
    isPaused = value;
    document.getElementById('instructions').classList.toggle('show', value);
    if (!value) { loop.lastTime = performance.now(); showToast('Find the golden beacon'); }
}
function toggleInstructions(){ setPaused(!isPaused); }

document.getElementById('play').addEventListener('click', function(){ setPaused(false); });
document.getElementById('help').addEventListener('click', function(){ setPaused(true); });
document.getElementById('mute').addEventListener('click', function(e){ muted = !muted; e.currentTarget.textContent = muted ? '×' : '♪'; showToast(muted ? 'Sound muted' : 'Sound on'); });
document.addEventListener('keydown', function(e){
    if (e.code === 'KeyF') camera.toggleFullscreen();
    if (e.code === 'Escape') setTimeout(function(){ if (!document.pointerLockElement) setPaused(true); }, 0);
});
document.addEventListener('visibilitychange', function(){ if (document.hidden) setPaused(true); });

document.querySelectorAll('[data-control]').forEach(function(button){
    var state = button.dataset.control;
    function down(e){ e.preventDefault(); controls.states[state] = true; }
    function up(e){ e.preventDefault(); controls.states[state] = false; }
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('pointerleave', up);
});
document.querySelector('[data-action="attack"]').addEventListener('pointerdown', function(e){ e.preventDefault(); if (!isPaused) player.attack(); });
