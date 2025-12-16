import * as THREE from 'three';

export class BookmarkManager {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.bookmarks = this.loadBookmarks();
        this.init();
    }

    init() {
        const bookmarkPanel = document.createElement('div');
        bookmarkPanel.id = 'bookmark-panel';
        bookmarkPanel.className = 'panel bookmark-panel hidden';
        bookmarkPanel.innerHTML = `
            <div class="panel-title">Bookmarks</div>
            <div class="bookmark-list" id="bookmark-list"></div>
            <button class="control-btn" id="add-bookmark-btn">Add Current View</button>
        `;
        document.getElementById('left-panels')?.appendChild(bookmarkPanel);

        document.getElementById('add-bookmark-btn')?.addEventListener('click', () => {
            this.addBookmark();
        });

        this.updateBookmarkList();
    }

    addBookmark() {
        const name = prompt('Enter bookmark name:');
        if (!name) return;

        const bookmark = {
            id: Date.now(),
            name: name,
            cameraPosition: this.solarSystem.camera.position.clone(),
            cameraTarget: this.solarSystem.controls.target.clone(),
            focusTarget: this.solarSystem.focusTarget?.name || null,
            date: new Date(this.solarSystem.currentDate)
        };

        this.bookmarks.push(bookmark);
        this.saveBookmarks();
        this.updateBookmarkList();
    }

    removeBookmark(id) {
        this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        this.saveBookmarks();
        this.updateBookmarkList();
    }

    loadBookmark(bookmark) {
        this.solarSystem.camera.position.copy(bookmark.cameraPosition);
        this.solarSystem.controls.target.copy(bookmark.cameraTarget);
        this.solarSystem.currentDate = new Date(bookmark.date);
        this.solarSystem.updateDateDisplay();
        
        if (bookmark.focusTarget) {
            const body = this.solarSystem.celestialBodies.find(b => b.name === bookmark.focusTarget) ||
                       this.solarSystem.spacecraft.find(s => s.name === bookmark.focusTarget);
            if (body) {
                this.solarSystem.focusTarget = body.mesh || body.model;
            }
        }
    }

    updateBookmarkList() {
        const list = document.getElementById('bookmark-list');
        if (!list) return;

        list.innerHTML = '';

        if (this.bookmarks.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No bookmarks yet</p>';
            return;
        }

        this.bookmarks.forEach(bookmark => {
            const item = document.createElement('div');
            item.className = 'bookmark-item';
            item.innerHTML = `
                <span class="bookmark-name">${bookmark.name}</span>
                <div class="bookmark-actions">
                    <button class="bookmark-load" data-id="${bookmark.id}">Load</button>
                    <button class="bookmark-delete" data-id="${bookmark.id}">×</button>
                </div>
            `;

            item.querySelector('.bookmark-load')?.addEventListener('click', () => {
                this.loadBookmark(bookmark);
            });

            item.querySelector('.bookmark-delete')?.addEventListener('click', () => {
                this.removeBookmark(bookmark.id);
            });

            list.appendChild(item);
        });
    }

    saveBookmarks() {
        try {
            const serialized = this.bookmarks.map(b => ({
                ...b,
                cameraPosition: { x: b.cameraPosition.x, y: b.cameraPosition.y, z: b.cameraPosition.z },
                cameraTarget: { x: b.cameraTarget.x, y: b.cameraTarget.y, z: b.cameraTarget.z }
            }));
            localStorage.setItem('solarSystemBookmarks', JSON.stringify(serialized));
        } catch (error) {
            console.error('Failed to save bookmarks:', error);
        }
    }

    loadBookmarks() {
        try {
            const stored = localStorage.getItem('solarSystemBookmarks');
            if (!stored) return [];
            const data = JSON.parse(stored);
            return data.map(b => ({
                ...b,
                cameraPosition: new THREE.Vector3(b.cameraPosition.x, b.cameraPosition.y, b.cameraPosition.z),
                cameraTarget: new THREE.Vector3(b.cameraTarget.x, b.cameraTarget.y, b.cameraTarget.z)
            }));
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            return [];
        }
    }

    toggleBookmark() {
        const panel = document.getElementById('bookmark-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }
}

