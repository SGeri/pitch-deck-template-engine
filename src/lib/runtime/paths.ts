import { tmpdir } from 'node:os';
import path from 'node:path';

const APP_TEMP_DIR = 'pitch-deck-template-engine';
const GENERATED_DIR = 'generated';

export function getGeneratedOutputDir(): string {
    return path.join(tmpdir(), APP_TEMP_DIR, GENERATED_DIR);
}
