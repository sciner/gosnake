var lightBaseTexture = null;
var lightTexture = null;
var lightUrl = '/light/light.png';

var fragmentShader = [
'precision mediump float;',
'varying vec4 vColor;',
'varying vec2 vTextureCoord;',
'uniform sampler2D u_texture; //diffuse map',
'uniform sampler2D u_lightmap;   //light map',
'uniform vec2 resolution; //resolution of screen',
'uniform vec4 ambientColor; //ambient RGB, alpha channel is intensity ',
'void main() {',
'    vec4 diffuseColor = texture2D(u_texture, vTextureCoord);',
'    vec2 lighCoord = (gl_FragCoord.xy / resolution.xy);',
'    vec4 light = texture2D(u_lightmap, vTextureCoord);',
'    vec3 ambient = ambientColor.rgb * ambientColor.a;',
'    vec3 intensity = ambient + light.rgb;',
'    vec3 finalColor = diffuseColor.rgb * intensity;',
'    gl_FragColor = vColor * vec4(finalColor, diffuseColor.a);',
'}'
].join('\n');

function LightmapFilter(lightmapTex, ambientColor=[0.3, 0.3, 0.7, 0.5], resolution=[1.0, 1.0]) {
  this.lightmapTex = lightmapTex;
  
  PIXI.AbstractFilter.call(
    this,
    null,
    fragmentShader,
    {
      u_lightmap: { 
        type: 'sampler2D', 
        value: lightmapTex 
      },
      resolution: {
        type: '2f', 
        value: new Float32Array(resolution)
      },
      ambientColor: {
        type: '4f', 
        value: new Float32Array(ambientColor)
      }
    });
}

LightmapFilter.prototype = Object.create(PIXI.AbstractFilter.prototype);
LightmapFilter.prototype.constructor = LightmapFilter;

var img = new Image();
img.crossOrigin = "Anonymous";
img.src = lightUrl;

//img.onload = function () {
	lightBaseTexture = new PIXI.BaseTexture(img);
	lightTexture = new PIXI.Texture(lightBaseTexture);
//}