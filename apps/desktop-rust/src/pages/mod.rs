pub mod home;

/// Server data a page shows.
pub enum Loadable<T> {
    Loading,
    Ready(T),
    Failed,
}
