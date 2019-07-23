const Apify = require('apify')
const { log, puppeteer } = Apify.utils
const { takeScreenshot, gifAddFrame, lossyCompression } = require('./helper')
const gifEncoder = require('gif-encoder')
const fs = require('fs')

Apify.main(async () => {
  const input = await Apify.getInput();
  const keyValueStore = await Apify.openKeyValueStore()

  const browser = await Apify.launchPuppeteer({
    useChrome: false
  })
  const page = await browser.newPage()

  log.info(`Setting page viewport to ${input.viewport.width}x${input.viewport.height}`)
  await page.setViewport({
    width: input.viewport.width,
    height: input.viewport.height
  })

  log.info(`Opening page: ${input.url}`)
  await page.goto(input.url, { waitUntil: 'networkidle2' })

  // get page height to determine when we scrolled to the bottom
  // initially used body height via boundingbox but this is not always equal to document height
  const pageHeight = await page.evaluate(() => document.body.scrollHeight)
  const scrollTop = await page.evaluate(() => document.body.getBoundingClientRect()['top'])

  let scrolledUntil = input.viewport.height - scrollTop   //set initial position the window/viewport is at
  const amountToScroll = Math.round(input.viewport.height * input.scrollPercentage)

  // create base gif file to write to
  // let gif = await keyValueStore.setValue('scroll.gif', buffer, {
  //   contentType: 'image/gif',
  // })

  const siteName = input.url.match(/(\w+\.)?[\w-]+\.\w+/g)

  let gif = new gifEncoder(input.viewport.width, input.viewport.height)
  const gifFileName = `${siteName}-scroll.gif`

  gif.setFrameRate(input.frameRate)
  gif.pipe(fs.createWriteStream(gifFileName))
  gif.writeHeader()

  // wait 3 sec to make sure page is fully loaded
  const waitTime = 3000
  log.info(`Wait for ${waitTime} ms so that page is fully loaded`)
  await new Promise(resolve => setTimeout(resolve, waitTime))

  // click cookie pop-up away
  log.info('Clicking cookie pop-up away')
  if (input.cookieAcceptSelector) {
    await page.waitForSelector(input.cookieAcceptSelector)
    await page.click(input.cookieAcceptSelector)
  }

  // add first frame multiple times so there is some delay before gif starts visually scrolling
  for (itt = 0; itt < input.beginDelay; itt++) {
    const initialScreenshotBuffer = await takeScreenshot(page, input)  // take screenshot each time so animations also show well
    await gifAddFrame(initialScreenshotBuffer, gif)
  }

  // scroll down
  while (pageHeight > scrolledUntil) {
    const screenshotBuffer = await takeScreenshot(page, input)

    await gifAddFrame(screenshotBuffer, gif)

    log.info(`Scrolling down by ${amountToScroll} pixels`)
    await page.evaluate(amountToScroll => {
      window.scrollBy(0, amountToScroll);
    }, amountToScroll);

    scrolledUntil += amountToScroll
  }

  gif.finish()

  await lossyCompression(gifFileName)
});
