import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Sin `test.globals: true` en vitest.config.ts, @testing-library/react no
// detecta un `afterEach` global para desmontar solo — sin esto, cada
// render() de un test queda pegado en el DOM del siguiente.
afterEach(cleanup)
