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

const getScrollParameters = async (page, input) => {
    // get page height to determine when we scrolled to the bottom
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)  // initially used body element height via .boundingbox() but this is not always equal to document height
    const scrollTop = await page.evaluate(() => document.documentElement.scrollTop)

    const initialPosition = input.viewport.height + scrollTop
    const scrollByAmount = Math.round(input.viewport.height * input.scrollPercentage)

    return {
        pageHeight,
        initialPosition,
        scrollByAmount
    }
}

const scrollDownProcess = async (page, gif, input) => {
    const { pageHeight, initialPosition, scrollByAmount } = await getScrollParameters(page, input)
    let scrolledUntil = initialPosition

    while (pageHeight > scrolledUntil) {
        const screenshotBuffer = await takeScreenshot(page, input)

        gifAddFrame(screenshotBuffer, gif)

        log.info(`Scrolling down by ${scrollByAmount} pixels`)
        await page.evaluate(scrollByAmount => {
            window.scrollBy(0, scrollByAmount)
        }, scrollByAmount)

        scrolledUntil += scrollByAmount
    }
}

const getGifBuffer = (gif, chunks) => {
    return new Promise((resolve, reject) => {
        gif.on('end', () => resolve(Buffer.concat(chunks)))
        gif.on('error', (error) => reject(error))
    })
}

const lossyCompression = async (buffer) => {
    log.info('Compressing gif (lossy)')
    const lossyBuffer = await imagemin.buffer(buffer, {
        plugins: [
            imageminGiflossy({
                lossy: 80,
                optimizationLevel: 3
            })
        ]
    })
    return lossyBuffer
}

const saveGif = async (fileName, buffer) => {
    log.info(`Saving ${fileName} to key-value store`)
    const keyValueStore = await Apify.openKeyValueStore()
    const gifSaved = await keyValueStore.setValue(fileName, buffer, {
        contentType: 'image/gif'
    })
    return gifSaved
}

const slowDownAnimations = async (page) => {
    log.info('Slowing down animations')

    const session = await page.target().createCDPSession()

    return await Promise.all([
        session.send('Animation.enable'),
        session.send('Animation.setPlaybackRate', {
            playbackRate: 0.1,
        })
    ])
}

module.exports = {
    takeScreenshot,
    gifAddFrame,
    scrollDownProcess,
    getGifBuffer,
    lossyCompression,
    saveGif,
    slowDownAnimations
}