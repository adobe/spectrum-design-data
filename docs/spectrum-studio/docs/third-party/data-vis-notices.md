# Data vis calculation notices

The full-severity protanopia, deuteranopia and tritanopia coefficient data in
`src/features/color-system/data-vis/cvd.ts` is adapted from Culori v4.0.2,
`src/deficiency.js`, inspected file revision
`3986a03e1c048f541a10a28050ebeff1b2c4c56a`.
Source: <https://github.com/Evercoder/culori/blob/v4.0.2/src/deficiency.js>.

The model is described by Machado, Oliveira and Fernandes, “A Physiologically-based
Model for Simulation of Color Vision Deficiency” (2009),
<https://doi.org/10.1109/TVCG.2009.113>.
This implementation applies the coefficients to linear sRGB and then clips and
encodes the simulated display result. It does not copy Culori's RGB wrapper.
The optional grayscale approximation uses linear relative luminance.
These are viewing estimates, not a medical diagnosis or accessibility certification.

## Culori MIT license

Copyright (c) 2018 Dan Burzo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Existing color dependency

Color.js supplies parsing, conversion and explicitly selected CIEDE2000.
Its MIT license is distributed with the installed `colorjs.io` package.
The standalone adapter build embeds that package's full license in its
JavaScript banner, so a downloaded adapter retains the required notice.
Color.js copyright: (c) 2021 Lea Verou, Chris Lilley.
