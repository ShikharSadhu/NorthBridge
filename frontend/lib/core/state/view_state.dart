enum ViewStatus {
  loading,
  success,
  empty,
  error,
}

class ViewState<T> {
  const ViewState._({
    required this.status,
    this.data,
    this.message,
  });

  final ViewStatus status;
  final T? data;
  final String? message;

  bool get isLoading => status == ViewStatus.loading;
  bool get isSuccess => status == ViewStatus.success;
  bool get isEmpty => status == ViewStatus.empty;
  bool get isError => status == ViewStatus.error;

  factory ViewState.loading({T? previousData}) {
    return ViewState._(
      status: ViewStatus.loading,
      data: previousData,
    );
  }

  factory ViewState.success(T data) {
    return ViewState._(
      status: ViewStatus.success,
      data: data,
    );
  }

  factory ViewState.empty({String? message}) {
    return ViewState._(
      status: ViewStatus.empty,
      message: message,
    );
  }

  factory ViewState.error(String message, {T? previousData}) {
    return ViewState._(
      status: ViewStatus.error,
      message: message,
      data: previousData,
    );
  }
}
