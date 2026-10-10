//! Cover art scaled on the CPU to the size it is drawn at. GPUI samples images
//! without mipmaps, so drawing a large cover small leaves jagged edges.

use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};

use futures::AsyncReadExt as _;
use gpui_kit::assets::IconName;
use gpui_kit::component::{Icon, h_flex};
use gpui_kit::http_client::AsyncBody;
use gpui_kit::*;
use image::imageops::FilterType;

/// Downloaded covers, kept so a new size does not download again.
static ORIGINALS: LazyLock<Mutex<HashMap<SharedUri, Arc<[u8]>>>> = LazyLock::new(Default::default);
const MAX_ORIGINALS: usize = 200;

/// Rounds sizes up so resizing the window re-scales only every few pixels.
const SIZE_STEP: u32 = 32;

/// Cover art filling a box of `size` with rounded top corners, or the icon while there is none.
/// GPUI clips children to rectangles, so the image rounds its own corners.
pub fn artwork(
    url: Option<&str>,
    size: Size<Pixels>,
    top_radius: Pixels,
    placeholder: IconName,
    color: Hsla,
) -> AnyElement {
    let placeholder = move || {
        h_flex()
            .size_full()
            .justify_center()
            .child(Icon::new(placeholder).size_12().text_color(color))
            .into_any_element()
    };

    match url {
        Some(url) => cover_image(url, size)
            .rounded_t(top_radius)
            .with_fallback(placeholder)
            .into_any_element(),
        None => placeholder(),
    }
}

/// An image cropped to fill a box of `size`, like CSS `object-fit: cover`.
pub fn cover_image(url: &str, size: Size<Pixels>) -> Img {
    let uri = SharedUri::from(url.to_string());

    img(move |window: &mut Window, cx: &mut App| {
        let scale = window.scale_factor();
        let source = (
            uri.clone(),
            device_pixels(size.width, scale),
            device_pixels(size.height, scale),
        );
        window.use_asset::<ScaledCover>(&source, cx)
    })
    .absolute()
    .inset_0()
    .size_full()
    .object_fit(ObjectFit::Cover)
}

fn device_pixels(length: Pixels, scale: f32) -> u32 {
    let pixels = (length.as_f32() * scale).ceil().max(1.) as u32;
    pixels.div_ceil(SIZE_STEP) * SIZE_STEP
}

enum ScaledCover {}

impl Asset for ScaledCover {
    type Source = (SharedUri, u32, u32);
    type Output = Result<Arc<RenderImage>, ImageCacheError>;

    fn load(
        (uri, width, height): Self::Source,
        cx: &mut App,
    ) -> impl Future<Output = Self::Output> + Send + 'static {
        let client = cx.http_client();

        async move {
            let cached = ORIGINALS.lock().unwrap().get(&uri).cloned();
            let bytes = match cached {
                Some(bytes) => bytes,
                None => {
                    let mut response = client
                        .get(&uri, AsyncBody::empty(), true)
                        .await
                        .map_err(|error| ImageCacheError::Other(Arc::new(error)))?;
                    let mut body = Vec::new();
                    response.body_mut().read_to_end(&mut body).await?;
                    if !response.status().is_success() {
                        return Err(ImageCacheError::BadStatus {
                            uri,
                            status: response.status(),
                            body: String::new(),
                        });
                    }

                    let bytes: Arc<[u8]> = body.into();
                    let mut originals = ORIGINALS.lock().unwrap();
                    if originals.len() >= MAX_ORIGINALS {
                        originals.clear();
                    }
                    originals.insert(uri, bytes.clone());
                    bytes
                }
            };

            let mut pixels = image::load_from_memory(&bytes)?
                .resize_to_fill(width, height, FilterType::Lanczos3)
                .into_rgba8();
            // GPUI draws BGRA.
            for pixel in pixels.as_chunks_mut::<4>().0 {
                pixel.swap(0, 2);
            }
            Ok(Arc::new(RenderImage::new(vec![image::Frame::new(pixels)])))
        }
    }
}
