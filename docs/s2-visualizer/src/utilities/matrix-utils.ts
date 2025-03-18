/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

export class MatrixUtils {
  static get defaultMatrix() {
    return [1, 0, 0, 1, 0, 0];
  }

  static getScalingTransform(scaleX: number, scaleY: number) {
    return [scaleX, 0, 0, scaleY, 0, 0];
  }

  static getTranslationTransform(x: number, y: number) {
    return [1, 0, 0, 1, x, y];
  }

  static scale(out: number[], a: number[], v: number[]) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const v0 = v[0];
    const v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
  }

  // example:
  // given global transform A and global transform B
  // what transform C multiplied by transform A will
  // yield transform B
  // ie - What is the local tranform within container A
  //      that is equivalent to the global transform B
  static difference(out: number[], a: number[], b: number[]) {
    return MatrixUtils.multiply(out, MatrixUtils.invert(out, a), b);
  }

  /*
   * A version of multiply that takes an arbitrary
   * number of matrices to multiply together in sequence
   */
  static multiply(out: number[], a: number[], ...b: number[][]) {
    let c = a;
    for (let i = 0; i < b.length; i += 1) {
      const d: number[] = b[i];
      const c0 = c[0];
      const c1 = c[1];
      const c2 = c[2];
      const c3 = c[3];
      const c4 = c[4];
      const c5 = c[5];
      const d0 = d[0];
      const d1 = d[1];
      const d2 = d[2];
      const d3 = d[3];
      const d4 = d[4];
      const d5 = d[5];
      out[0] = c0 * d0 + c2 * d1;
      out[1] = c1 * d0 + c3 * d1;
      out[2] = c0 * d2 + c2 * d3;
      out[3] = c1 * d2 + c3 * d3;
      out[4] = c0 * d4 + c2 * d5 + c4;
      out[5] = c1 * d4 + c3 * d5 + c5;
      c = out;
    }
    return out;
  }

  static rotate(out: number[], a: number[], rad: number) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = a0 * c + a2 * s;
    out[1] = a1 * c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
  }

  static translate(out: number[], a: number[], v: number[]) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const v0 = v[0];
    const v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
  }

  static transformPoint(x: number, y: number, m: number[]) {
    return {
      x: x * m[0] + y * m[2] + m[4],
      y: x * m[1] + y * m[3] + m[5],
    };
  }

  static invert(out: number[], a: number[]) {
    const aa = a[0];
    const ab = a[1];
    const ac = a[2];
    const ad = a[3];
    const atx = a[4];
    const aty = a[5];
    let det = aa * ad - ab * ac;
    if (!det) {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      out[4] = 0;
      out[5] = 0;
      return out;
    }
    det = 1.0 / det;
    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
  }

  static compose(x = 0, y = 0, r = 0) {
    const out = this.defaultMatrix;
    this.translate(out, out, [x, y]);
    this.rotate(out, out, r);
    return out;
  }

  static decompose(m: number[]) {
    const a = m[0];
    const b = m[1];
    const c = m[2];
    const d = m[3];
    const tx = m[4];
    const ty = m[5];
    const skewX = -Math.atan2(-c, d);
    const skewY = Math.atan2(b, a);
    const delta = Math.abs(skewX + skewY);
    const isNotZeroRotation =
      delta < 0.00001 || Math.abs(Math.PI * 2 - delta) < 0.00001;

    return {
      skew: {
        x: isNotZeroRotation ? 0 : skewX,
        y: isNotZeroRotation ? 0 : skewY,
      },
      scale: {
        x: Math.sqrt(a * a + b * b),
        y: Math.sqrt(c * c + d * d),
      },
      position: {
        x: tx,
        y: ty,
      },
      rotation: isNotZeroRotation ? skewY : 0,
    };
  }

  static decomposeScale(m: number[]) {
    const a = m[0];
    const b = m[1];
    const c = m[2];
    const d = m[3];
    return {
      x: Math.sqrt(a * a + b * b),
      y: Math.sqrt(c * c + d * d),
    };
  }
}

export default MatrixUtils;
