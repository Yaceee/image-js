/**
 * @memberof ROIManager
 * @instance
 */

import ROIMap from './../ROIMap';
import PriorityQueue from 'js-priority-queue';

/**
 *
 * @param fillMaxValue Limit of filling. By example, we can fill to a maximum value 32000 of a 16 bitDepth image.
 * @param points Array of object [{x:2, y:3, id:1}, ...]. The id for each points is obligatory
 * @param interval is a parameter which specify the level of filling each iteration. Every pixels in the current interval will be filled.
 * @param mask is a binary image, the same size as the image. The algorithm will fill only if the current pixel in the binary mask is true.
 * @returns {ROIMap}
 */

export default function createROIMapFromWaterShed(
    {
        fillMaxValue = this.maxValue,
        points,
        mask
    } = {}
)
{
    let image = this;
    image.checkProcessable('createROIMapFromWaterShed', {
        bitDepth: [8, 16],
        components: 1
    });

    //WaterShed is done from points in the image. We can either specify those points in options,
    // or it is gonna take the minimum locals of the image by default.
    if (!points) {
        points = image.getLocalExtrema({algorithm:'min', mask:mask});
    }

    let map = new Int16Array(image.size);
    let width = image.width;
    let height = image.height;
    let toProcess = new PriorityQueue(
        {
            comparator: function (a, b) { return a[2] - b[2];},
            strategy: PriorityQueue.BinaryHeapStrategy
        }
    );
    for (let i = 0; i < points.length; i++) {
        let index = points[i].x + points[i].y * width;
        map[index] = i + 1;
        let intensity = image.data[index];
        if (intensity <= fillMaxValue) {
            toProcess.queue([points[i].x, points[i].y, intensity]);
        }
    }
    //dx and dy is to iterate through neighbour up down left and right.
    let dx =  [+1, 0, -1, 0];
    let dy =  [0, +1, 0, -1];


    //Then we iterate through each points
    while (toProcess.length > 0) {
        let currentPoint = toProcess.dequeue();
        let currentValueIndex = currentPoint[0] + currentPoint[1] * width;

        for (let dir = 0; dir < 4; dir++) {
            let newX = currentPoint[0] + dx[dir];
            let newY = currentPoint[1] + dy[dir];
            if (newX >= 0 && newY >= 0 && newX < width && newY < height) {
                let currentNeighbourIndex = newX + newY * width;
                if (!mask || mask.getBit(currentNeighbourIndex)) {
                    let intensity = image.data[currentNeighbourIndex];
                    if (intensity <= fillMaxValue) {
                        if (map[currentNeighbourIndex] === 0) {
                            map[currentNeighbourIndex] = map[currentValueIndex];
                            toProcess.queue([currentPoint[0] + dx[dir], currentPoint[1] + dy[dir], intensity]);
                        }
                    }
                }
            }
        }
    }

    return new ROIMap(image, map);
}
