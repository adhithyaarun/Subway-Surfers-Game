main();
// For music
setInterval(() => {
  if(!PAUSE && GAME) {
    audio.play();
  }
  else {
    audio.pause();
  }
}, 10);

setInterval(() => {
  flash = true;
    setTimeout(() => {
        flash = false;
        setTimeout(() => {
            flash = true;
            setTimeout(() => {
                flash = false;
                setTimeout(() => {
                    flash = true;
                    setTimeout(() => {
                        flash = false;
                        setTimeout(() => {
                            flash = true;
                            setTimeout(() => {
                                flash = false;
                                setTimeout(() => {
                                    flash = true;
                                    setTimeout(() => {
                                        flash = false;
                                    }, 500);
                                }, 500);
                            }, 500);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}, 30000);

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uNormalMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform bool flash;

    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;

      highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      
      // highp vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);
      highp vec3 directionalLightColor = vec3(1.0, 0.95, 0.82);
      
      // highp vec3 directionalVector = vec3(0.85, 0.8, 0.75);
      highp vec3 directionalVector = vec3(0.25, 0.8, 0.75);
      
      if(flash) {
        directionalLightColor = vec3(1.7, 1.7, 1.7);
      }

      highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

      highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);
    }
  `;

  // Fragment shader program
 const fsSource = `
    precision mediump float;  
    varying highp vec2 vTextureCoord;
    varying highp vec3 vLighting;

    uniform sampler2D uSampler;
    uniform float now;
    uniform bool grayscale;

    vec4 convertToGrayscale(in vec4 color) {
      float mean = (color.r + color.g + color.b) / 3.0;
      return vec4(mean, mean, mean, 1.0);
    }

    vec4 convertToColor(in vec4 gray, in vec4 color) {
      return (gray * color);
    }

    void main(void) {
      highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

      if(grayscale) 
      {
        gl_FragColor = convertToGrayscale(vec4(texelColor.rgb * vLighting, texelColor.a));
      }
      else
      {
        gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
      }

    }
  `;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      grayscale: gl.getUniformLocation(shaderProgram, 'grayscale'),
      flash: gl.getUniformLocation(shaderProgram, 'flash'),
    },
  };

  dynamicObjects = createDynamic(gl);
  staticObjects = createStatic(gl);

  var dynamicBuffers = [];
  var staticBuffers = [];

  for(i in dynamicObjects)
  {
    dynamicBuffers.push(initBuffers(gl, dynamicObjects[i]));
  }
  
  for(i in staticObjects)
  {
    staticBuffers.push(initBuffers(gl, staticObjects[i]));
  }

  var then = 0;

  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    if (!GAME)
    {
      return 0;
    }

    if(!PAUSE && GAME)
    {  
      // gl.clearColor(0.9, 0.7, 0.3, 0.7); // Clear to black, fully opaque
      gl.clearColor(0.76, 0.99, 1.0, 1.0);  // Clear to sky colour
      gl.clearDepth(1.0);                   // Clear everything
      gl.enable(gl.DEPTH_TEST);             // Enable depth testing
      gl.depthFunc(gl.LEQUAL);              // Near things obscure far things

      // Clear the canvas before we start drawing on it.
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


      // Perspective matrix
      const fieldOfView = 45 * Math.PI / 180;                         // Radians
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      const zNear = 0.1;
      const zFar = 100.0;
      const projectionMatrix = mat4.create();

      mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);
      
      for(i in dynamicObjects)
      {
        dynamicObjects[i].translation[2] += speed;
        distance += speed;

        if (dynamicObjects[i].type === 'TRAIN')
        {
          dynamicObjects[i].translation[2] += (2 * speed);
        }
        if(Math.floor(distance) % 12000 == 0 && distance > 12000 && speed < 0.45)
        {
          speed += 0.01;
        }
        
        if (dynamicObjects[i].translation[2] > 32.0)
        {
          if(DESTRUCTIBLE[dynamicObjects[i].type])
          {
            dynamicObjects.splice(i, 1);
            dynamicBuffers.splice(i, 1);
            i--;
            continue;
          }
          else
          {
            switch(dynamicObjects[i].type)
            {
              case "TRACK":
                dynamicObjects[i].translation[2] -= 16 * 9; 
                break;
              case 'GROUND':
                if(dynamicObjects[i].translation[2] > 96.0)
                {
                  dynamicObjects[i].translation[2] -= 100 * 2; 
                }
                break;
              case 'WALL':
                dynamicObjects[i].translation[2] -= 25 * 12; 
                break;
            }
          }
        }

        if(dynamicObjects[i].type === 'COIN')
        {
          dynamicObjects[i].rotation[1] += 0.05;
        }

        drawScene(gl, programInfo, dynamicBuffers[i], deltaTime, dynamicObjects[i], projectionMatrix);
      }
      
      if (direction[0])
      {
        switch (staticObjects[0].translation[0])
        {
          case M_TRACK:
            staticObjects[0].translation[0] = L_TRACK;
            direction[0] = false;
            break;
          case R_TRACK:
            staticObjects[0].translation[0] = M_TRACK;
            direction[0] = false;
            break;
          default:
            direction[0] = false;
            break;
        }
      }
      else if (direction[3])
      {
        switch (staticObjects[0].translation[0]) 
        {
          case M_TRACK:
            staticObjects[0].translation[0] = R_TRACK;
            direction[3] = false;
            break;
          case L_TRACK:
            staticObjects[0].translation[0] = M_TRACK;
            direction[3] = false;
            break;
          default:
            direction[3] = false;
            break;
        }
      }
        
      // Jumping
      if(direction[1] && player_position == ON_GROUND)
      {
        direction[1] = false;
        gravity = false;
        base = staticObjects[0].translation[1];
      }
      // Ducking
      else if(direction[2])
      {
        direction[2] = false;
        gravity = true;
      }

      if(gravity)
      {
        if(staticObjects[0].translation[1] > PLAYER_GROUND)
        {
          staticObjects[0].translation[1] -= 0.1;
        }
        else
        {
          player_position = ON_GROUND;
        }
      }
      else
      {
        if(Math.abs(staticObjects[0].translation[1] - base) < (1.5 * jump))
        {
          staticObjects[0].translation[1] += 0.1;
          player_position = IN_AIR;
        }
        else
        {
          gravity = true;
        }
      }

      for(i in staticObjects)
      {
        if(staticObjects[i].type == 'POLICE' && distance > 350.0 && staticObjects[i].translation[2] < 3.0)
        {
          staticObjects[i].translation[2] += 0.05;
        }
        drawScene(gl, programInfo, staticBuffers[i], deltaTime, staticObjects[i], projectionMatrix);
      }
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
