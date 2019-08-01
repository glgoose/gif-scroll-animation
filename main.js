const Apify = require('apify')
const { log } = Apify.utils
const GifEncoder = require('gif-encoder')
const {
  takeScreenshot,
  gifAddFrame,
  scrollDownProcess,
  getGifBuffer,
  compressGif,
  saveGif,
  slowDownAnimations
} = require('./src/helper')

const wait = async (time) => {
  log.info(`Wait for ${time} ms`)
  return new Promise(resolve => setTimeout(resolve, time))
}

Apify.main(async () => {
  const input = await Apify.getInput()

  const browser = await Apify.launchPuppeteer({})
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewportWidth}x${input.viewportHeight}`)
  await page.setViewport({
    width: input.viewportWidth,
    height: input.viewportHeight
  })

  if (input.slowDownAnimations) {
    slowDownAnimations(page)
  }

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  if (input.waitToLoadPage) {
    await wait(input.waitToLoadPage)
  }

  // remove cookie window if specified
  if (input.cookieWindowSelector) {
    try {
      await page.waitForSelector(input.cookieWindowSelector)

      log.info('Removing cookie pop-up window')
      await page.$eval(input.cookieWindowSelector, el => el.remove())
    } catch (err) {
      log.info('Selector for cookie pop-up window is likely incorrect')
    }
  }

  // set-up gif encoder
  let chunks = []
  let gif = new GifEncoder(input.viewportWidth, input.viewportHeight)

  gif.setFrameRate(input.frameRate)
  gif.setRepeat(0)  //loop indefinitely
  gif.on('data', (chunk) => chunks.push(chunk))
  gif.writeHeader()

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  const framesBeforeAction = (input.captureBeforeAction / 1000) * input.frameRate
  for (itt = 0; itt < framesBeforeAction; itt++) {
    const screenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(screenshotBuffer, gif)
  }

  // start scrolling down and take screenshots
  if (input.scrollDown) {
    await scrollDownProcess(page, gif, input)
  }

  browser.close()

  gif.finish()
  const gifBuffer = await getGifBuffer(gif, chunks)

  const siteName = input.url.match(/(\w+\.)?[\w-]+\.\w+/g)
  const baseFileName = `${siteName}-scroll`

  try {
    const orignialGifSaved = await saveGif(`${baseFileName}_original`, gifBuffer)

    if (input.lossyCompression) {
      const lossyBuffer = await compressGif(gifBuffer, 'lossy')
      log.info('Lossy compression finished')
      const lossyGifSaved = await saveGif(`${baseFileName}_lossy-comp`, lossyBuffer)
    }

    if (input.loslessCompression) {
      const loslessBuffer = await compressGif(gifBuffer, 'losless')
      log.info('Losless compression finished')
      const loslessGifSaved = await saveGif(`${baseFileName}_losless-comp`, loslessBuffer)
    }
  } catch (error) {
    log.error(error)
  }

  log.info('Actor finished')
})
