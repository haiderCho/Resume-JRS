// Simple Implementation of PCA (Principal Component Analysis)
// We need to reduce 384 dimensions -> 2 dimensions for visualization.



// We will use ml-matrix if available, but if not, we can write a simplified covariance logic.
// However, since we can't install packages easily without user, we will attempt to implement 
// a lightweight covariance + power iteration or just random projection if user doesn't have ml-matrix.
// BUT, honestly, implementing SVD from scratch in TS is error prone.
// Let's create a "Mockable" PCA that is mathematically surprisingly simple for 2D.
// Just computing the Covariance Matrix and finding the top 2 eigenvectors.
// WAIT: We don't have 'ml-matrix' installed.
// CHECK `package.json` earlier: it had `@huggingface/inference`, `dotenv`, `mammoth`, `pdf-parse`, `react`.
// NO MATH LIBRARY.

// PLAN: Write a pure TS implementation of Power Iteration for finding top eigenvectors.
// It's robust enough for visualization.

type Vector = number[];
type Matrix2D = number[][];

export function computePCA(data: Matrix2D): { x: number, y: number }[] {
  // 1. Center the data (Mean centering)
  const n = data.length;
  if (n === 0) return [];
  const d = data[0].length;
  
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += data[i][j];
    }
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = data.map(row => row.map((val, j) => val - mean[j]));

  // 2. Compute Covariance Matrix (d x d) (approximated)
  // Cov = (X^T * X) / (n - 1)
  // For 384 dimensions, d*d is ~147k elements. Small enough for JS engine.
  // However, Power Iteration doesn't NEED the full Covariance matrix if we do matrix-vector multiplication.
  // v_new = Cov * v_old = (X^T * X) * v / (n-1) = X^T * (X * v) / (n-1)
  // This is O(n*d) instead of O(d^2). Much faster if n (50 jobs) < d (384).
  // Wait, N=50, D=384. N < D. 
  // We can just Compute Gram Matrix (N x N) which is 50x50!
  // Gram = X * X^T
  // The eigenvectors of Gram matrix can be transformed to eigenvectors of Covariance.
  // This is "Dual PCA".
  
  // Let's use Dual PCA step-by-step.
  
  // Step 2: Compute Gram Matrix G = X * X^T (N x N)
  const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < d; k++) {
        dot += centered[i][k] * centered[j][k];
      }
      G[i][j] = dot;
      G[j][i] = dot; // Symmetric
    }
  }

  // Step 3: Find Eigenvectors of G (Top 2) using Power Iteration with Deflation
  const ev1 = powerIteration(G, n);
  // Deflate G to find second eigenvector: G' = G - lambda1 * v1 * v1^T
  const lambda1 = rayleighQuotient(G, ev1);
  
  const G2 = G.map((row, i) => row.map((val, j) => val - lambda1 * ev1[i] * ev1[j]));
  const ev2 = powerIteration(G2, n);

  // Now we have eigenvectors of Gram matrix (alpha vectors).
  // The PCs of Original data (U) are X^T * alpha (scaled).
  // But wait, the Projection of X onto U is just... G * alpha?
  // Coordinate of point i on PC 1 = Row i of centered X dot Product with PC1.
  // If PC1 = Sigma (alpha_i * x_i) ... 
  // It turns out, for Dual PCA, the coordinates are simply:
  // Coord 1 = alpha1 * sqrt(lambda1)
  // Coord 2 = alpha2 * sqrt(lambda2)
  // Wait, let's just project directly.
  // The projection T = U * S.
  // For Gram approaches, the columns of eigenvectors of G *are* the principal components coordinates (up to scaling).
  
  // Let's verify: G = U S^2 U^T (SVD of centered X = U S V^T).
  // Yes, eigen decomp of Gram gives U.
  // Coordinates are U * S.
  
  const coordinates = [];
  const scale1 = Math.sqrt(Math.abs(lambda1));
  const lambda2 = rayleighQuotient(G2, ev2);
  const scale2 = Math.sqrt(Math.abs(lambda2));

  for (let i = 0; i < n; i++) {
    coordinates.push({
      x: ev1[i] * scale1,
      y: ev2[i] * scale2
    });
  }

  return coordinates;
}

function powerIteration(A: number[][], n: number, iterations = 20): number[] {
  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  // Normalize
  let mag = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  v = v.map(val => val / mag);

  for (let iter = 0; iter < iterations; iter++) {
    // w = A * v
    const w = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        w[i] += A[i][j] * v[j];
      }
    }
    // Normalize w
    mag = Math.sqrt(w.reduce((sum, val) => sum + val * val, 0));
    if (mag < 1e-9) break; // Zero vector check
    v = w.map(val => val / mag);
  }
  return v;
}

function rayleighQuotient(A: number[][], v: number[]): number {
  // (v^T A v) / (v^T v) -- v is already unit length, so just v^T A v
  let num = 0;
  const n = A.length;
  // Compute A*v first
  const Av = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      Av[i] += A[i][j] * v[j];
    }
  }
  // Dot with v
  for (let i = 0; i < n; i++) {
    num += v[i] * Av[i];
  }
  return num;
}
