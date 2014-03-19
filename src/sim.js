var simulation_vs = [
  'precision mediump float;'
, 'attribute vec2 pos;'
, '  void main() {'
, '  gl_Position = vec4( pos.xy, 1.0 , 1.0);'
, '  }'
].join('\n')

var forceShader = [
, 'precision mediump float;'

, 'uniform sampler2D texture;'
, 'uniform vec2 resolution;'
, 'uniform vec2 mouse;'
, 'uniform vec2 dimensions;'
, 'vec4 texelAtOffet( vec2 offset ) { '
  + 'return texture2D(texture, (gl_FragCoord.xy + offset) / dimensions); }'
, 'void main() {'
    , 'vec3 TARGET = vec3(mouse / resolution, 0.01 );'
    , 'int slot = int( mod( gl_FragCoord.x, 2.0 ) );'
    , 'if ( slot == 0 ) { '
        , 'vec4 dataA = texelAtOffet( vec2( 0, 0 ) );'
        , 'vec4 dataB = texelAtOffet( vec2( 1, 0 ) );'
        , 'vec3 pos = dataA.xyz;'
        , 'vec3 vel = dataB.xyz;'
        , 'float phase = dataA.w;'
        , 'if ( phase > 0.0 ) {'
            , 'pos += vel * 0.005;'
            , 'if ( length( TARGET - pos ) < 0.035 ) phase = 0.0;'
        , '    else phase += 0.1;'
        , '} else {'
        , '    pos = vec3(-1);'
        , '}'
    , '    gl_FragColor = vec4( pos, phase );'
    , '} else if ( slot == 1 ) { '
        , 'vec4 dataA = texelAtOffet( vec2( -1, 0 ) );'
        , 'vec4 dataB = texelAtOffet( vec2( 0, 0 ) );'
        , 'vec3 pos = dataA.xyz;'
        , 'vec3 vel = dataB.xyz;'
        , 'float phase = dataA.w;'
        , 'if ( phase > 0.0 ) {'
            , 'vec3 delta = normalize( TARGET - pos );'
            , 'vel += delta * 0.05;'
        , '    vel *= 0.991;'
        , '} else {'
        , '    vel = vec3(0);'
        , '}'
    , '    gl_FragColor = vec4( vel, 1.0 );'
, '    }'
, '}'
].join('\n')

pathgl.sim = {}

function nextSquare(n) {
  return Math.pow(Math.ceil(Math.sqrt(n)), 2)
}

var since = Date.now()
pathgl.sim.force = function (size) {
  var particleData = new Float32Array(2 * 4 * size)
  var width = Math.sqrt(size) * 2
  var height = Math.sqrt(size)
  var elapsed = 0, cooldown = 16
  var node  = d3.select('canvas')
  var rate = 1000
  var particleIndex = 0

  return pathgl.texture(forceShader, {
    step: step
  , data: particleData
  , width: width
  , height: height
  , size: size
  , start: start
  })
  function step () {}
  function start () {
    var now = Date.now() - since
    , origin = [ -1.0 + Math.sin(now * 0.001) * 2.0
                 , -0.2 + Math.cos(now * 0.004) * 0.5
                 , Math.sin(now * 0.015) * -0.05]

    pathgl.uniform('dimensions', [width, height])
    d3.select(window).on('mousemove.physics', mousemove.bind(this))
    emit(this.gl, this.texture, 40000, origin)
  }
  function mousemove() {
    if (Date.now() - elapsed < cooldown) return
    var count = rate * Math.random()
      , origin = svgToClipSpace(d3.mouse(node.node())).concat(0)
    elapsed = Date.now()
    emit(this.gl, this.texture, count, origin)
  }

  function emit(gl, tex, count, origin, velocities) {
    velocities = velocities || { x:0, y:0, z:0 }
    gl.activeTexture( gl.TEXTURE0 + tex.unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)

    var x = ~~(( particleIndex * 2) % width)
    var y = ~~(particleIndex / height)
    var chunks = [{ x: x, y: y, size: count * 2 }]

    function split( chunk ) {
      var boundary = chunk.x + chunk.size;
      if (boundary > width) {
        var delta = boundary - width
        chunk.size -= delta;
        chunk = { x: 0, y: ( chunk.y + 1 ) % height, size: delta }
        chunks.push(chunk)
        split(chunk)
      }
    }

    split(chunks[0])
    var i, j, n, m, chunk, data, force = 1.0;
    for (i = 0, n = chunks.length; i < n; i++) {
      chunk = chunks[i]
      data = []
      for (j = 0, m = chunk.size; j < m; j++) {
        data.push(
          origin[0],
          origin[1],
          0,
          Math.random() * 10,
          velocities.x + force * random(-1.0, 1.0),
          velocities.y + force * random(-1.0, 1.0),
          velocities.z + force * random(-1.0, 1.0),
          0
        )
      }

      gl.texSubImage2D(gl.TEXTURE_2D, 0, chunk.x, chunk.y, chunk.size, 1,
                       gl.RGBA, gl.FLOAT, new Float32Array(data))
    }

    particleIndex += count
    particleIndex %= size
  }
}

function random (min, max) {
  return Math.random() * ( max - min );
}
function svgToClipSpace(pos) { return [2 * (pos[0] / 960) - 1, 1 - (pos[1] / 500 * 2)] }