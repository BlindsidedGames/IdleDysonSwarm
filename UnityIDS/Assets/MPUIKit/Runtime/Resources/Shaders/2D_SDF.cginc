#ifndef SDF_2D
#define SDF_2D

float circle(float2 _samplePosition, float _radius){
    return length(_samplePosition) - _radius;
}

float rectanlge(float2 _samplePosition, float _width, float _height){
    float2 d = abs(_samplePosition) - float2(_width, _height) / 2.0;
    float sdf = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    return sdf;
}

//Credit: https://www.shadertoy.com/view/XdXcRB | MIT License
float ndot(float2 a, float2 b ) { return a.x*b.x - a.y*b.y; }
float sdRhombus(float2 p, float2 b) {
    float2 q = abs(p);
    float h = clamp((-2.0*ndot(q,b)+ndot(b,b))/dot(b,b),-1.0,1.0);
    float d = length( q - 0.5*b*float2(1.0-h,1.0+h) );
    return d * sign( q.x*b.y + q.y*b.x - b.x*b.y );
}
//EndCredit

//Credit: https://www.shadertoy.com/view/MldcD7 | MIT License
float sdTriangleIsosceles(float2 p, float2 q )
{
    p.x = abs(p.x);
    float2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
    float2 b = p - q*float2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
    float s = -sign( q.y );
    float2 d = min( float2( dot(a,a), s*(p.x*q.y-p.y*q.x) ), float2( dot(b,b), s*(p.y-q.y)  ));
    return -sqrt(d.x)*sign(d.y);
}
//EndCredit

//Credit: https://www.shadertoy.com/view/3tSGDy | MIT License
float sdNStarPolygon(in float2 p, in float r, in float n, in float m) // m=[2,n]
{
    float an = 3.141593/float(n);
    float en = 3.141593/m;
    float2  acs = float2(cos(an),sin(an));
    float2  ecs = float2(cos(en),sin(en));
    float bn = abs(atan2(p.x, p.y)) % (2.0*an) - an;
    p = length(p)*float2(cos(bn),abs(sin(bn)));
    p -= r*acs;
    p += ecs*clamp( -dot(p,ecs), 0.0, r*acs.y/ecs.y);
    return length(p)*sign(p.x);
}
//EndCredit

float sampleSdf(float _sdf, float _offset){
    float sdf = saturate(-_sdf * _offset);
    return sdf;
}

float sampleSdfStrip(float _sdf, float _stripWidth, float _offset){
   
    float l = (_stripWidth+1.0/_offset)/2.0;
	return saturate((l-distance(-_sdf,l))*_offset);
}

float sdfUnion(float _a, float _b){
    return max(_a, _b);
}

float sdfIntersection(float _a, float _b){
    return min(_a, _b);
}

float sdfDifference(float _a, float _b)
{
    return max(_a, -_b);
}

float map(float val, float low1, float high1, float low2, float high2){
    return low2 + (val - low1) * (high2 - low2) / (high1 - low1);
}

#endif