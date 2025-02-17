import engine from './engine';
import Point from './math/point';
import * as INPUT from './input/input';

export default class Core {
  constructor() {
    this.FRAMES_PER_SECOND = 60;
    this.TIME_PER_FRAME = 1000 / this.FRAMES_PER_SECOND; // milliseconds

    this.paused = false;
    this.halted = false;

    // Drawing state
    this.canvas = null;
    this.ctx = null;

    this.size = new Point(500, 500);

    // Should use requestAnimationFrame or not
    this.useAnimationFrame = false;
    this.timeLastRender = new Date().getTime(); // Time since last render
    this.timeGameStart = new Date().getTime(); // Init time

    // To count frames per second
    this.fpsPassed = 0; // frames rendered since last time
    this.fps = this.FRAMES_PER_SECOND; // updated only each second
  }

  // Game Initialization
  initialize(canvasElementId) {
    engine.logs.log(
      'Engine::Core.initialize',
      'Initializing engine core object',
    );

    this.canvas = document.getElementById(canvasElementId);
    this.size.x = this.canvas.width;
    this.size.y = this.canvas.height;
    this.timeLastRender = new Date().getMilliseconds();

    this.ctx = this.canvas.getContext && this.canvas.getContext('2d');

    if (!this.ctx) {
      engine.logs.log(
        'Engine::Core.initialize',
        'Old browser, unable to create canvas context',
      );
      alert('Unable to get canvas context. Old browser?');
      return null;
    }

    engine.logs.log(
      'Engine::Core.initialize',
      'UserAgent: ' + engine.device.getUserAgent(),
    );

    // Sometimes this is slower, I don't know why, and that makes me angry :(
    if (
      engine.options.useAnimationFrame === false ||
      window.requestAnimationFrame === null
    ) {
      this.useAnimationFrame = false;
      engine.logs.log(
        'Engine::Core.initialize',
        'NOT using requestAnimationFrame',
      );
    } else {
      this.useAnimationFrame = true;
      engine.logs.log(
        'Engine::Core.initialize',
        'Modern browser, using requestAnimationFrame',
      );
    }

    // Start main loop
    this.loop();

    return 1;
  }

  // Game Initialization
  activate() {
    engine.logs.log('Engine::activate', 'Starting engine');
    engine.game.activate();
    engine.scenes.advanceScene();
  }

  eventKeyPressed(keyCode) {
    // engine.logs.log('Engine::eventKeyPressed', 'Key Pressed: ' + keyCode);

    if (keyCode == INPUT.KEYS.P && engine.options.allowPause === true) {
      if (this.paused) {
        this.unpauseGame();
      } else if (engine.scenes.getCurrentScene().playable !== false) {
        this.pauseGame();
      }
    } else if (
      keyCode == INPUT.KEYS.ESC &&
      engine.options.allowHalt === true
    ) {
      if (this.halted) {
        this.halted = false;
        engine.logs.log('Engine::eventKeyPressed', 'Engine un-halted');
        // To avoid a jump in animations and movements, as timeLastRender haven has not been
        // updated since last step()
        this.timeLastRender = new Date().getTime();
        this.loop();
      } else {
        this.halted = true;
        engine.logs.log('Engine::eventKeyPressed', 'Engine halted');
        engine.scenes
          .getCurrentScene()
          .gui.get('console')
          .addText('halt', 'Engine halted');
        engine.scenes.getCurrentScene().gui.draw(this.ctx); // Force draw before halting the loop
      }
    } else if (
      keyCode == INPUT.KEYS.F &&
      engine.options.allowFForFps === true &&
      !this.paused &&
      !this.halted
    ) {
      if (engine.options.showFps === true) {
        engine.options.showFps = false;
      } else {
        engine.options.showFps = true;
      }
    }
  }

  // Game Loop
  loop() {
    let now = new Date().getTime();
    let dt = now - this.timeLastRender;

    if (dt >= engine.core.TIME_PER_FRAME) {
      this.timeLastRender = now;
      let sc = engine.scenes.getCurrentScene();

      if (this.halted) {
        return;
      }

      // Only the current scene
      if (sc && sc.isCurrent === true) {
        // Only advance game logic if game is not paused
        if (this.paused === false) {
          sc.step(dt);
          if (engine.game !== undefined) {
            engine.game.step(dt);
          }
          engine.effects.step(dt);
          engine.particles.step(dt);
        }

        engine.clock.step(dt);
        engine.player.step(dt);

        // Render current level
        sc.draw(this.ctx);

        engine.effects.draw(this.ctx);
        engine.particles.draw(this.ctx);

        // FPS related stuff
        this.fpsPassed++;

        if (engine.options.showStatistics === true) {
          if (sc.getAttachedItems().length > 0) {
            sc.gui
              .get('console')
              .addText(
                'numItems',
                sc.getAttachedItems().length +
                  ' ' +
                  engine.localization.get('items'),
              );
          }
          if (engine.effects.effects.length > 0) {
            sc.gui
              .get('console')
              .addText(
                'numEffects',
                engine.effects.effects.length +
                  ' ' +
                  engine.localization.get('effects'),
              );
          }
          if (engine.particles.particles.length > 0) {
            sc.gui
              .get('console')
              .addText(
                'numParticles',
                engine.particles.particles.length +
                  ' ' +
                  engine.localization.get('particles'),
              );
          }
        }
      }

      // If the loop has been executed, wait a full TIME_PER_FRAME until next loop step
      dt = 0;
    }

    if (this.useAnimationFrame === true) {
      window.requestAnimationFrame(function () {
        engine.core.loop();
      });
    } else {
      setTimeout(function () {
        engine.core.loop();
      }, engine.core.TIME_PER_FRAME - dt);
    }
  }

  clearScreen() {
    this.ctx.clearRect(0, 0, this.size.x, this.size.y);
  }

  pauseGame() {
    if (engine.options.allowPause === false) {
      return;
    }

    this.paused = true;
    engine.scenes.getCurrentScene().pauseGame();
  }

  unpauseGame() {
    if (engine.options.allowPause === false) {
      return;
    }

    this.paused = false;
    engine.scenes.getCurrentScene().unpauseGame();
  }
}
