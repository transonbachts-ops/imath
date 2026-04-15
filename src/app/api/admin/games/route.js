import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const gamesDir = path.join(process.cwd(), 'public', 'games');
        
        // Ensure directory exists
        if (!fs.existsSync(gamesDir)) {
            return NextResponse.json({ games: [] });
        }

        const files = fs.readdirSync(gamesDir);
        const games = files
            .filter(file => file.endsWith('.html'))
            .map(file => ({
                name: file.replace(/_/g, ' ').replace('.html', '').replace(/\b\w/g, l => l.toUpperCase()),
                file: file,
                url: `/games/${file}`
            }));

        return NextResponse.json({ games });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
