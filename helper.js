const Apify = require('apify')
const { log } = Apify.utils
const PNG = require('pngjs').PNG
const gifEncoder = require('gifencoder')
// const GIFEncoder = require('gif-encoder')

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

// const decodePng = (buffer) => {
//     let png = new PNG2(buffer)
//     return new Promise(resolve => png.decode(pixels => resolve(pixels)))
// }

const gifAddFrame = async (screenshotBuffer, gif) => {
    try {
        const png = await parsePngBuffer(screenshotBuffer)
        const pixels =  png.data
        // const pixels = await decodePng(screenshotBuffer)

        log.debug('Adding frame to gif')
        gif.addFrame(pixels)
    }
    catch (error) {
        log.error(error)
    }
}

module.exports = {
    takeScreenshot,
    gifAddFrame
}