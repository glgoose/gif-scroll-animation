const Apify = require('apify')
const { log } = Apify.utils
const GifEncoder = require('gif-encoder')
const {
  takeScreenshot,
  gifAddFrame,
  scrollDownProcess,
  getGifBuffer,
  lossyCompression,
  saveGif,
  slowDownAnimations
} = require('./helper')


Apify.main(async () => {
  const input = await Apify.getInput()

  const browser = await Apify.launchPuppeteer({
    useChrome: false
  })
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewport.width}x${input.viewport.height}`)
  await page.setViewport({
    width: input.viewport.width,
    height: input.viewport.height
  })

  if (input.slowDownAnimations) {
    slowDownAnimations(page)
  }

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  // set up gif encoder
  let chunks = []
  let gif = new GifEncoder(input.viewport.width, input.viewport.height)

  gif.setFrameRate(input.frameRate)
  gif.on('data', (chunk) => chunks.push(chunk))
  gif.writeHeader()

  if (input.waitToLoad) {
    log.info(`Wait for ${input.waitToLoad} ms so that page is fully loaded`)
    await new Promise(resolve => setTimeout(resolve, input.waitToLoad))
  }

  // click cookie pop-up away
  if (input.acceptCookieSelector) {
    log.info('Clicking cookie pop-up away')
    await page.waitForSelector(input.acceptCookieSelector)
    await page.click(input.acceptCookieSelector)
  }

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  for (itt = 0; itt < input.framesBeforeScrolling; itt++) {
    const screenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(screenshotBuffer, gif)
  }

  // start scrolling down and take screenshots
  await scrollDownProcess(page, gif, input)
  browser.close()

  gif.finish()
  const gifBuffer = await getGifBuffer(gif, chunks)

  const siteName = input.url.match(/(\w+\.)?[\w-]+\.\w+/g)
  const baseFileName = `${siteName}-scroll`

  try {
    const orignialGifSaved = saveGif(`${baseFileName}_original.gif`, gifBuffer)

    const lossyBuffer = await lossyCompression(gifBuffer)
    log.info('Lossy compression finished')

    const lossyGifSaved = await saveGif(`${baseFileName}_lossy-comp.gif`, lossyBuffer)

    await Promise.all([
      orignialGifSaved,
      lossyGifSaved
    ])
  } catch (error) {
    log.error(error)
  }

  log.info('Actor finished')
})
