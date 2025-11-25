# Vectorizer Implementation Notes

Research notes on implementing our own image vectorization vs using vectorizer.ai.

## Current Implementation

We use [vectorizer.ai](https://vectorizer.ai) API to convert raster images (PNG) to SVG. The integration is in `app/api/vectorize/route.ts`.

## What Image Vectorization Involves

Image tracing/vectorization converts pixels to mathematical curves:

- **Color quantization** - reducing millions of colors to meaningful groups
- **Edge detection** - finding boundaries between color regions
- **Curve fitting** - converting jagged pixel edges to smooth Bézier curves
- **Path optimization** - simplifying paths without losing detail
- **Topology handling** - managing holes, nested shapes, overlapping regions

## Difficulty: Very Hard 🔴

### Open Source Options

| Tool | Quality | Notes |
|------|---------|-------|
| **Potrace** | Medium | Bitmap-only (B&W), needs preprocessing for color |
| **AutoTrace** | Low-Medium | Older, limited maintenance |
| **VTracer** (Rust) | Medium-High | Modern, handles color, can compile to WASM |
| **ImageMagick** | Low | Basic tracing only |

### Self-Hosted Implementation Paths

**Effort estimate:**
- 2-4 weeks for a basic version
- 2-6 months to match vectorizer.ai quality

**Options:**
1. **VTracer + WASM**: Run in browser or Node.js - best open-source option
2. **Potrace + color preprocessing**: Split image by color, trace each, merge
3. **Custom ML model**: Train on image→SVG pairs (massive undertaking)

## Comparison

| Aspect | vectorizer.ai | DIY (VTracer) |
|--------|---------------|---------------|
| **Setup time** | 5 minutes | 1-3 days |
| **Quality** | Excellent | Good |
| **Cost** | ~$0.10/image | Free after setup |
| **Maintenance** | None | You maintain it |
| **Edge cases** | Handled | You debug them |

## Recommendations

- **For production**: Keep using vectorizer.ai unless cost is prohibitive
- **For experimentation**: Try [VTracer](https://github.com/nicekens/vtracer) - it has a Rust library and WASM bindings
- **For full control**: Build a pipeline with Potrace + ImageMagick for color separation

## Resources

- [VTracer GitHub](https://github.com/nicekens/vtracer)
- [Potrace](http://potrace.sourceforge.net/)
- [vectorizer.ai API docs](https://vectorizer.ai/api)
