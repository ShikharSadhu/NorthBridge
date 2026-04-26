import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/device_image_picker.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/models/chat_model.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/chat_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';
import 'package:frontend/widgets/user_name_with_avatar.dart';

class ChatThreadScreen extends StatefulWidget {
  const ChatThreadScreen({
    super.key,
    required this.chatProvider,
    required this.authProvider,
    required this.taskProvider,
    required this.chat,
  });

  static const String routeName = '/chat/thread';

  final ChatProvider chatProvider;
  final AuthProvider authProvider;
  final TaskProvider taskProvider;
  final ChatModel chat;

  @override
  State<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends State<ChatThreadScreen> {
  final TextEditingController _messageController = TextEditingController();
  bool _isSendingLocally = false;

  String get _currentUserId {
    return widget.authProvider.state.data?.id ??
        widget.chat.users.firstWhere(
          (userId) => userId != widget.chat.taskOwnerUserId,
          orElse: () => widget.chat.taskOwnerUserId,
        );
  }

  String get _fallbackSenderId {
    return widget.chat.users.firstWhere(
      (userId) => userId != widget.chat.taskOwnerUserId,
      orElse: () => widget.chat.taskOwnerUserId,
    );
  }

  @override
  void initState() {
    super.initState();
    widget.chatProvider.loadChats();
    widget.chatProvider.loadMessages(widget.chat.chatId);
  }

  @override
  void dispose() {
    widget.chatProvider.loadChats();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_isSendingLocally || widget.chatProvider.isSendingMessage) {
      return;
    }

    final text = _messageController.text.trim();
    if (text.isEmpty) {
      return;
    }

    _messageController.clear();
    setState(() {
      _isSendingLocally = true;
    });

    try {
      await widget.chatProvider.sendMessage(
        chatId: widget.chat.chatId,
        taskId: widget.chat.taskId,
        senderId: _currentUserId.isNotEmpty ? _currentUserId : _fallbackSenderId,
        text: text,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSendingLocally = false;
        });
      } else {
        _isSendingLocally = false;
      }
    }
  }

  Future<void> _confirmTaskAcceptance() async {
    final outcome = await widget.taskProvider.confirmTaskAcceptance(
      taskId: widget.chat.taskId,
      ownerUserId: _currentUserId,
    );

    if (!mounted) {
      return;
    }

    switch (outcome) {
      case TaskAcceptanceDecisionOutcome.accepted:
        await widget.chatProvider.sendMessage(
          chatId: widget.chat.chatId,
          taskId: widget.chat.taskId,
          senderId: _currentUserId,
          text: 'Acceptance confirmed. You can start working on this task now.',
        );
        break;
      case TaskAcceptanceDecisionOutcome.notFound:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task not found.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.notTaskOwner:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Only task owner can review acceptance.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.noPendingRequest:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pending acceptance request.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.alreadyAccepted:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task is already accepted.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.declined:
      case TaskAcceptanceDecisionOutcome.failed:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to confirm acceptance right now.')),
        );
        break;
    }
  }

  Future<void> _declineTaskAcceptance() async {
    final outcome = await widget.taskProvider.declineTaskAcceptance(
      taskId: widget.chat.taskId,
      ownerUserId: _currentUserId,
    );

    if (!mounted) {
      return;
    }

    switch (outcome) {
      case TaskAcceptanceDecisionOutcome.declined:
        await widget.chatProvider.loadChats();
        await widget.chatProvider.loadMessages(widget.chat.chatId);
        break;
      case TaskAcceptanceDecisionOutcome.notFound:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task not found.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.notTaskOwner:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Only task owner can review acceptance.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.noPendingRequest:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pending acceptance request.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.alreadyAccepted:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task is already accepted.')),
        );
        break;
      case TaskAcceptanceDecisionOutcome.accepted:
      case TaskAcceptanceDecisionOutcome.failed:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to decline request right now.')),
        );
        break;
    }
  }

  Uint8List? _decodeDataUrl(String? dataUrl) {
    if (dataUrl == null || dataUrl.isEmpty) {
      return null;
    }

    final parts = dataUrl.split(',');
    if (parts.length < 2) {
      return null;
    }

    try {
      return base64Decode(parts.last);
    } catch (_) {
      return null;
    }
  }

  Future<void> _attachImage() async {
    final pickedDataUrl = await pickImageAsDataUrl();
    if (pickedDataUrl == null) {
      return;
    }

    await widget.chatProvider.sendMessage(
      chatId: widget.chat.chatId,
      taskId: widget.chat.taskId,
      senderId: _currentUserId.isNotEmpty ? _currentUserId : _fallbackSenderId,
      text: _messageController.text.trim().isEmpty
          ? 'Image attachment'
          : _messageController.text.trim(),
      imageDataUrl: pickedDataUrl,
    );
    _messageController.clear();
  }

  Future<void> _askForPayment() async {
    final isOwnTask = _currentUserId == widget.chat.taskOwnerUserId;
    if (isOwnTask) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Ask for payment is only available in accepted-task chats.'),
        ),
      );
      return;
    }

    final user = widget.authProvider.state.data;
    final qrDataUrl = user?.privatePaymentQrDataUrl ?? '';

    if (qrDataUrl.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload your UPI QR in profile.')),
      );
      return;
    }

    await widget.chatProvider.sendMessage(
      chatId: widget.chat.chatId,
      taskId: widget.chat.taskId,
      senderId: _currentUserId.isNotEmpty ? _currentUserId : _fallbackSenderId,
      text: 'Please complete payment using this UPI QR.',
      imageDataUrl: qrDataUrl,
      isPaymentRequest: true,
    );
  }

  Future<void> _showImagePreview(Uint8List bytes) async {
    await showDialog<void>(
      context: context,
      builder: (context) {
        return Dialog(
          child: InteractiveViewer(
            maxScale: 4,
            child: Image.memory(bytes, fit: BoxFit.contain),
          ),
        );
      },
    );
  }

  Future<void> _reportUser({required String userId}) async {
    final reasonController = TextEditingController();
    String? errorText;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Report user'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Why are you reporting this user?'),
                  const SizedBox(height: AppSpacing.xs),
                  TextField(
                    controller: reasonController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Enter report reason',
                      errorText: errorText,
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    final reason = reasonController.text.trim();
                    if (reason.isEmpty) {
                      setDialogState(() {
                        errorText = 'Please enter a reason';
                      });
                      return;
                    }
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(this.context).showSnackBar(
                      SnackBar(
                        content: Text('Report submitted for $userId.'),
                      ),
                    );
                  },
                  child: const Text('Submit report'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _requestTaskCompletion() async {
    final outcome = await widget.taskProvider.requestTaskCompletion(
      taskId: widget.chat.taskId,
      helperUserId: _currentUserId,
    );

    if (!mounted) {
      return;
    }

    switch (outcome) {
      case RequestCompletionOutcome.requested:
        await widget.chatProvider.sendMessage(
          chatId: widget.chat.chatId,
          taskId: widget.chat.taskId,
          senderId: _currentUserId,
          text: 'Task marked as done. Please confirm completion.',
        );
        break;
      case RequestCompletionOutcome.notFound:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task not found.')),
        );
        break;
      case RequestCompletionOutcome.notAcceptedHelper:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Only accepted helper can request completion.')),
        );
        break;
      case RequestCompletionOutcome.alreadyCompleted:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task is already completed.')),
        );
        break;
      case RequestCompletionOutcome.failed:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to request completion right now.')),
        );
        break;
    }
  }

  Future<void> _confirmTaskCompleted() async {
    final outcome = await widget.taskProvider.confirmTaskCompletion(
      taskId: widget.chat.taskId,
      ownerUserId: _currentUserId,
    );

    if (!mounted) {
      return;
    }

    switch (outcome) {
      case ConfirmCompletionOutcome.completed:
        await widget.chatProvider.sendMessage(
          chatId: widget.chat.chatId,
          taskId: widget.chat.taskId,
          senderId: _currentUserId,
          text: 'Task marked as completed. Please rate the helper (1-5).',
        );
        break;
      case ConfirmCompletionOutcome.notFound:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task not found.')),
        );
        break;
      case ConfirmCompletionOutcome.notTaskOwner:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Only task owner can confirm completion.')),
        );
        break;
      case ConfirmCompletionOutcome.noPendingRequest:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pending completion request.')),
        );
        break;
      case ConfirmCompletionOutcome.alreadyCompleted:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task is already completed.')),
        );
        break;
      case ConfirmCompletionOutcome.declined:
      case ConfirmCompletionOutcome.failed:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to confirm completion right now.')),
        );
        break;
    }
  }

  Future<void> _declineTaskCompletion() async {
    final outcome = await widget.taskProvider.declineTaskCompletion(
      taskId: widget.chat.taskId,
      ownerUserId: _currentUserId,
    );

    if (!mounted) {
      return;
    }

    switch (outcome) {
      case ConfirmCompletionOutcome.declined:
        await widget.chatProvider.sendMessage(
          chatId: widget.chat.chatId,
          taskId: widget.chat.taskId,
          senderId: _currentUserId,
          text: 'Completion request declined. Task remains active.',
        );
        break;
      case ConfirmCompletionOutcome.notFound:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task not found.')),
        );
        break;
      case ConfirmCompletionOutcome.notTaskOwner:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Only task owner can review completion request.')),
        );
        break;
      case ConfirmCompletionOutcome.noPendingRequest:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pending completion request.')),
        );
        break;
      case ConfirmCompletionOutcome.alreadyCompleted:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task is already completed.')),
        );
        break;
      case ConfirmCompletionOutcome.completed:
      case ConfirmCompletionOutcome.failed:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to decline request right now.')),
        );
        break;
    }
  }

  Future<void> _submitCompletionRating(double rating, String targetUserId) async {
    final updatedProfile = await widget.authProvider.submitRatingForUser(
      targetUserId: targetUserId,
      rating: rating,
    );
    final taskOutcome = await widget.taskProvider.submitTaskRating(
      taskId: widget.chat.taskId,
      ownerUserId: _currentUserId,
      rating: rating,
    );

    if (!mounted) {
      return;
    }

    if (updatedProfile && taskOutcome == SubmitRatingOutcome.rated) {
      await widget.taskProvider.loadTasks();
      await widget.authProvider.loadCurrentUser();
      await widget.chatProvider.sendMessage(
        chatId: widget.chat.chatId,
        taskId: widget.chat.taskId,
        senderId: _currentUserId,
        text: 'Rated helper: ${rating.toStringAsFixed(1)}/5',
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unable to submit rating right now.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conversation'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: AnimatedBuilder(
              animation: Listenable.merge(
                [widget.chatProvider, widget.taskProvider, widget.authProvider],
              ),
              builder: (context, _) {
                final state = widget.chatProvider.messagesState;
                final liveChats = widget.chatProvider.state.data ?? const [];
                ChatModel activeChat = widget.chat;
                for (final chat in liveChats) {
                  if (chat.chatId == widget.chat.chatId) {
                    activeChat = chat;
                    break;
                  }
                }
                final messages = state.data ?? const [];
                final currentUserId = _currentUserId;
                final matchingTasks = widget.taskProvider.tasks
                    .where((item) => item.id == widget.chat.taskId)
                    .toList(growable: false);
                final task = matchingTasks.isEmpty ? null : matchingTasks.first;
                final isOwnTask = currentUserId == widget.chat.taskOwnerUserId;
                final counterpartUserId = widget.chat.users.firstWhere(
                  (id) => id != currentUserId,
                  orElse: () => widget.chat.taskOwnerUserId,
                );
                final isPendingHelper = task != null &&
                    task.pendingAcceptanceByUserId == currentUserId &&
                    currentUserId != widget.chat.taskOwnerUserId;
                final canOwnerReviewAcceptance = task != null &&
                    task.isActive &&
                    isOwnTask &&
                    task.pendingAcceptanceByUserId == counterpartUserId;
                final isAcceptedHelper = task != null &&
                    task.acceptedByUserId == currentUserId &&
                    currentUserId != widget.chat.taskOwnerUserId;
                final counterpartName =
                    counterpartUserId == widget.chat.taskOwnerUserId
                        ? widget.chat.taskOwnerName
                        : 'User';

                if (state.isLoading && messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.isError && messages.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          state.message ?? 'Unable to load messages.',
                          style: theme.textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        AppButton(
                          label: 'Retry',
                          onPressed: () => widget.chatProvider
                              .loadMessages(widget.chat.chatId),
                          isFullWidth: false,
                        ),
                      ],
                    ),
                  );
                }
                final hasNoMessages = state.isEmpty || messages.isEmpty;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppCard(
                      child: Padding(
                        padding: AppSpacing.cardPadding,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Task: ${widget.chat.taskTitle}',
                              style: theme.textTheme.titleMedium,
                            ),
                            const SizedBox(height: AppSpacing.xxs),
                            UserNameWithAvatar(
                              userId: counterpartUserId,
                              name: counterpartName,
                              onTap: () => AppRoutes.goToPublicProfile(
                                context,
                                userId: counterpartUserId,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            OutlinedButton.icon(
                              onPressed: () => _reportUser(
                                userId: counterpartUserId,
                              ),
                              icon: const Icon(Icons.flag_outlined),
                              label: const Text('Report user'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (task != null &&
                        task.isActive &&
                        canOwnerReviewAcceptance) ...[
                      const SizedBox(height: AppSpacing.xs),
                      AppCard(
                        child: Padding(
                          padding: AppSpacing.cardPadding,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'This user requested to accept the task.',
                                style: theme.textTheme.bodyMedium,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _confirmTaskAcceptance,
                                      child: const Text('Accept'),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.xs),
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _declineTaskAcceptance,
                                      child: const Text('Decline'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (task != null &&
                        task.isActive &&
                        isPendingHelper &&
                        !activeChat.isClosed) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Acceptance request sent. Waiting for the task giver to accept or decline.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    if (task != null && task.isActive && isAcceptedHelper) ...[
                      const SizedBox(height: AppSpacing.xs),
                      OutlinedButton.icon(
                        onPressed: _requestTaskCompletion,
                        icon: const Icon(Icons.task_alt_outlined),
                        label: const Text('Mark task as done'),
                      ),
                    ],
                    if (task != null &&
                        task.isActive &&
                        isAcceptedHelper &&
                        task.completionRequestedByUserId == currentUserId) ...[
                      const SizedBox(height: AppSpacing.xxs),
                      Text(
                        'Completion request sent. Waiting for task giver confirmation.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    if (task != null &&
                        task.isActive &&
                        isOwnTask &&
                        (task.completionRequestedByUserId ?? '').isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      AppCard(
                        child: Padding(
                          padding: AppSpacing.cardPadding,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Helper marked task as done. Confirm completion?',
                                style: theme.textTheme.bodyMedium,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: _confirmTaskCompleted,
                                      child: const Text('Mark completed'),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.xs),
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _declineTaskCompletion,
                                      child: const Text('Not yet'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (task != null &&
                        !task.isActive &&
                        task.isRatingPending &&
                        isOwnTask &&
                        (task.completedByUserId ?? '').isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      AppCard(
                        child: Padding(
                          padding: AppSpacing.cardPadding,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Rate the helper',
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Wrap(
                                spacing: AppSpacing.xs,
                                children: [1, 2, 3, 4, 5]
                                    .map(
                                      (value) => OutlinedButton(
                                        onPressed: widget.authProvider.isMutating
                                            ? null
                                            : () => _submitCompletionRating(
                                                  value.toDouble(),
                                                  task.completedByUserId!,
                                                ),
                                        child: Text('$value ★'),
                                      ),
                                    )
                                    .toList(growable: false),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (activeChat.isClosed) ...[
                      const SizedBox(height: AppSpacing.xs),
                      AppCard(
                        child: Padding(
                          padding: AppSpacing.cardPadding,
                          child: Text(
                            'This chat has been closed by the task giver.',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    Expanded(
                      child: hasNoMessages
                          ? Center(
                              child: Text(
                                state.message ?? 'No messages yet. Start the conversation.',
                                style: theme.textTheme.bodyMedium,
                                textAlign: TextAlign.center,
                              ),
                            )
                          : ListView.separated(
                              itemCount: messages.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final message = messages[index];
                                return Align(
                                  alignment: message.senderId == currentUserId
                                      ? Alignment.centerRight
                                      : Alignment.centerLeft,
                                  child: Container(
                                    constraints:
                                        const BoxConstraints(maxWidth: 480),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: AppSpacing.sm,
                                      vertical: AppSpacing.xs,
                                    ),
                                    decoration: BoxDecoration(
                                      color: message.senderId == currentUserId
                                          ? theme.colorScheme.primaryContainer
                                          : theme.colorScheme.surfaceContainerLow,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (message.isPaymentRequest)
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              bottom: AppSpacing.xxs,
                                            ),
                                            child: Text(
                                              'Payment request',
                                              style:
                                                  theme.textTheme.labelMedium,
                                            ),
                                          ),
                                        Text(
                                          message.text,
                                          style: theme.textTheme.bodyMedium,
                                        ),
                                        if (message.imageDataUrl
                                                ?.trim()
                                                .isNotEmpty ==
                                            true) ...[
                                          const SizedBox(
                                            height: AppSpacing.xs,
                                          ),
                                          Builder(
                                            builder: (context) {
                                              final bytes = _decodeDataUrl(
                                                message.imageDataUrl,
                                              );
                                              if (bytes == null) {
                                                return Text(
                                                  'Unable to preview image',
                                                  style:
                                                      theme.textTheme.bodySmall,
                                                );
                                              }
                                              return ClipRRect(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                child: GestureDetector(
                                                  onTap: () =>
                                                      _showImagePreview(bytes),
                                                  child: Image.memory(
                                                    bytes,
                                                    width: 180,
                                                    height: 180,
                                                    fit: BoxFit.cover,
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ],
                                        const SizedBox(height: AppSpacing.xxs),
                                        Text(
                                          formatChatTime(message.timestamp),
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                            color: theme.colorScheme
                                                .onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppCard(
                      child: Padding(
                        padding: AppSpacing.cardPadding,
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _messageController,
                                textInputAction: TextInputAction.send,
                                enabled: !activeChat.isClosed,
                                onSubmitted: (_) => _send(),
                                decoration: InputDecoration(
                                  hintText: activeChat.isClosed
                                      ? 'Chat closed'
                                      : 'Type a message',
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            IconButton(
                              onPressed: widget.chatProvider.isSendingMessage ||
                                      activeChat.isClosed
                                  ? null
                                  : _attachImage,
                              icon: const Icon(Icons.attach_file),
                              tooltip: 'Attach image',
                            ),
                            const SizedBox(width: AppSpacing.xxs),
                            FilledButton(
                              onPressed: widget.chatProvider.isSendingMessage ||
                                      _isSendingLocally ||
                                      activeChat.isClosed
                                  ? null
                                  : _send,
                              child: Text(
                                widget.chatProvider.isSendingMessage ||
                                        _isSendingLocally
                                    ? '...'
                                    : 'Send',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: isOwnTask || !isAcceptedHelper || activeChat.isClosed
                          ? const SizedBox.shrink()
                          : OutlinedButton.icon(
                              onPressed: widget.chatProvider.isSendingMessage
                                  ? null
                                  : _askForPayment,
                              icon: const Icon(Icons.qr_code_2_outlined),
                              label: const Text('Ask for payment'),
                            ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
