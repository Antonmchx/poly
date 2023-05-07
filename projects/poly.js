export const testSQ = `#version 300 es
precision highp float;
#define PI 3.14159265359
uniform vec2 u_resolution;
uniform float u_time, u_color_shift, u_polygone_adges;
out vec4 final;

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }



float polygonshape (vec2 position, float radius, float sides){
    position = position * 2.0 - 1.0;
    float angle = atan(position.x, position.y);
    float slice = PI * 2.0 / sides;

    return step(radius,cos(floor(0.5 + angle/slice)* slice - angle)* length(position) ); //map(cos(u_time*0.03),-1.0,1.0,0.2,0.8)
}

void main(){
    float h = sin(u_time * 0.0005);
    float h1 = map(h, -1.0,1.0,0.2,0.8);
    // float h2 = map(u_color_shift,0.0,1.0,3.0,0.6);
    vec2 position = gl_FragCoord.xy / u_resolution;
    vec3 color;
    float polygon = polygonshape (position,h1,u_polygone_adges); //h1
    vec3 c2 = vec3(0.7,0.15,0.12);
    //color = vec3(polygon);

    if (polygon > 0.0 ){
        color = vec3(0.2,0.3,u_color_shift);
    } else {
        color = vec3(0.05);
    }
        final= vec4(color, 1.0 );

}`;
