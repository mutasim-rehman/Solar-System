// Mission path visualization system
import * as THREE from 'three';

export class MissionPathVisualizer {
    constructor(scene) {
        this.scene = scene;
        this.missions = new Map();
        this.paths = new Map();
    }

    addMission(missionData) {
        const {
            name,
            spacecraft,
            waypoints,
            trajectory,
            color = 0x00ff88,
            visible = true
        } = missionData;

        // Create trajectory path
        const path = this.createTrajectoryPath(trajectory, color);
        path.visible = visible;
        this.scene.add(path);

        // Create waypoint markers
        const waypointGroup = new THREE.Group();
        waypoints.forEach((waypoint, index) => {
            const marker = this.createWaypointMarker(waypoint, index, color);
            waypointGroup.add(marker);
        });
        waypointGroup.visible = visible;
        this.scene.add(waypointGroup);

        // Create timeline
        const timeline = this.createTimeline(missionData);

        this.missions.set(name, {
            name,
            spacecraft,
            path,
            waypointGroup,
            timeline,
            visible,
            color
        });
        this.paths.set(name, path);

        return { path, waypointGroup, timeline };
    }

    createTrajectoryPath(trajectory, color) {
        const points = trajectory.map(point => 
            new THREE.Vector3(point.x, point.y || 0, point.z)
        );

        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.5, 8, false);
        
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Add line for better visibility
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        mesh.add(line);

        return mesh;
    }

    createWaypointMarker(waypoint, index, color) {
        const geometry = new THREE.SphereGeometry(5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        const marker = new THREE.Mesh(geometry, material);
        
        marker.position.set(waypoint.x, waypoint.y || 0, waypoint.z);
        marker.userData.waypoint = waypoint;
        marker.userData.index = index;

        // Add label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'waypoint-label';
        labelDiv.textContent = waypoint.name || `Waypoint ${index + 1}`;
        labelDiv.style.color = `#${color.toString(16).padStart(6, '0')}`;
        
        const { CSS2DObject } = require('three/addons/renderers/CSS2DRenderer.js');
        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 10, 0);
        marker.add(label);

        return marker;
    }

    createTimeline(missionData) {
        const timeline = {
            start: new Date(missionData.startDate),
            end: new Date(missionData.endDate),
            events: missionData.events || []
        };

        return timeline;
    }

    animateMission(name, currentDate) {
        const mission = this.missions.get(name);
        if (!mission) return;

        // Animate spacecraft along path
        if (mission.spacecraft && mission.path) {
            const progress = this.calculateProgress(mission.timeline, currentDate);
            if (progress >= 0 && progress <= 1) {
                const curve = mission.path.geometry.parameters.path;
                const point = curve.getPoint(progress);
                mission.spacecraft.position.copy(point);
                
                // Orient spacecraft along path
                const tangent = curve.getTangent(progress);
                mission.spacecraft.lookAt(point.clone().add(tangent));
            }
        }
    }

    calculateProgress(timeline, currentDate) {
        const total = timeline.end - timeline.start;
        const elapsed = currentDate - timeline.start;
        return Math.max(0, Math.min(1, elapsed / total));
    }

    toggleMission(name, visible) {
        const mission = this.missions.get(name);
        if (mission) {
            mission.visible = visible;
            mission.path.visible = visible;
            mission.waypointGroup.visible = visible;
        }
    }

    removeMission(name) {
        const mission = this.missions.get(name);
        if (mission) {
            this.scene.remove(mission.path);
            this.scene.remove(mission.waypointGroup);
            this.missions.delete(name);
            this.paths.delete(name);
        }
    }

    updateAll(currentDate) {
        this.missions.forEach((mission, name) => {
            if (mission.visible) {
                this.animateMission(name, currentDate);
            }
        });
    }
}

