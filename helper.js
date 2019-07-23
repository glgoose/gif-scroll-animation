const Apify = require('apify')
const { log } = Apify.utils
const PNG = require('pngjs').PNG
const imagemin = require('imagemin');
const imageminGiflossy = require('imagemin-giflossy')

const takeScreenshot = async (page, { fullPage = false, omitBackground = false }) => {
    log.info('Taking screenshot')

    const screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage,
        omitBackground
    })

    return screenshotBuffer
}

const parsePngBuffer = (buffer) => {
    let png = new PNG()
    return new Promise((resolve, reject) => {
        png.parse(buffer, (error, data) => {
            if (data) {
                resolve(data)
            } else {
                reject(error)
            }
        })
    })
}

const gifAddFrame = async (screenshotBuffer, gif) => {
    try {
        const png = await parsePngBuffer(screenshotBuffer)
        const pixels = png.data

        log.debug('Adding frame to gif')
        gif.addFrame(pixels)
    }
    catch (error) {
        log.error(error)
    }
}

const lossyCompression = async (gifFileName) => {
    log.info('Optimizing gif')
    await imagemin([gifFileName], {
        destination: `${gifFileName}_lossy-comp`, 
        plugins: [
            imageminGiflossy({ 
                lossy: 80,
                optimizationLevel: 3
            })
        ] 
    })
}

module.exports = {
    takeScreenshot,
    gifAddFrame,
    lossyCompression
}