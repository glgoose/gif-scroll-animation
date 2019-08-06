# Actor - Gif scroll animation

## Description
This actor is good for:  
* capturing scroll animations     
* visually checking the clicking of elements  

It can be tricky to get a good recording of animations that appear when scrolling down a page. You would have to scroll down in a constant manner, capture the screen.

If you want to show-case your work or share it somewhere then you might want to use a gif because of the automatic looping and wide browser support.

Or when you want to visually check a lot of pages to see how they behave for UX purposes, then you might not want to do it manually, certainly if you have to do this regularly.

## How it works
The actor goes to the URL of the specified page and takes screenshots. Those screenshots serve as frames which are made into a gif.

## Output
### Example
Gif for scrolling down www.franshalsmuseum.nl:  

![Frans Hals Museam gif](./src/gif-examples/www.franshalsmuseum.nl-scroll_lossy-comp.gif)

### Storage
The gif files are stored in the key-value store.  
The original gif will always be saved and depending on the compression method(s) selected those will also be saved there.

## Input parameters
| Field    | Type   | Required | Default | Description |
| -------- | ------ | -------- | ------- | ----------- |
| url      | string | Yes      |         | Website URL |
| frameRate | integer | No | 7 | Number of frames per second (fps) |
| scrollDown | boolean | Yes |  | When true, the actor will scroll down the page and capture it to create the gif. |
| scrollPercentage | integer | No | 10 | Amount to scroll down determined as a percentage of the vierport height. (%) |
| recordingTimeBeforeAction | integer | No | 1 | Amount of time to capture the screen before doing any action like scrolling down or clicking. (ms) | 
| clickSelector | integer | No |  | Used to click an element and record it. |
| recordingTimeAfterClick | integer | No | Amount of time to record the screen after clicking an element with the click selector. | 
| waitToLoadPage | integer | No | 0 | Set time to wait in the beginning so that page is fully loaded. (ms) |  
| cookieWindowSelector | string | No | | CSS selector to remove cookie pop-up window if one is present. |
| slowDownAnimations | boolean | No | false |When selected it slows down animations on the page so they can be properly captured. |
| lossyCompression | boolean | No | true | Lossy LZW compression of GIF using Giflossy. |
| loslessCompression | boolean | No | false | Losless compression of GIF using Gifsicle. |
| viewportWidth | integer | No | 1366 | Inner width of browser window (pixels) |  
| viewportHeight | integer | No | 768 | Inner height of browser window (pixels) |

### Input example
```json
{
  "url": "https://www.franshalsmuseum.nl/en/",
    "frameRate": 7,
    "scrollDown": true,
    "recordingTimeBeforeAction": 1500,
    "cookieWindowSelector": ".cookiebar"
}
```

## Future development
* use screen recording instead of screenshots
* output in video formats (webM, mp4)
* add proxy support
* provide multiple URLs on input