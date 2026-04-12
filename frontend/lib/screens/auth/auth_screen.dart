import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';

class AuthScreen extends StatelessWidget {
  const AuthScreen({
    super.key,
    required this.authProvider,
  });

  static const String routeName = '/auth';

  final AuthProvider authProvider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: AnimatedBuilder(
              animation: authProvider,
              builder: (context, _) {
                final state = authProvider.state;
                final user = state.data;

                return AppCard(
                  child: Padding(
                    padding: AppSpacing.cardPadding,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Authentication',
                            style: theme.textTheme.titleLarge),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          state.isLoading
                              ? 'Loading account state...'
                              : state.isError
                                  ? (state.message ?? 'Something went wrong.')
                                  : state.isEmpty
                                      ? (state.message ??
                                          'No authenticated user.')
                                      : 'Signed in as ${user?.name ?? ''}',
                          style: theme.textTheme.bodyMedium,
                        ),
                        if (user != null) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            '${user.location} • Rating ${user.rating.toStringAsFixed(1)}',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                        const SizedBox(height: AppSpacing.md),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: authProvider.isMutating
                                    ? null
                                    : authProvider.loadCurrentUser,
                                child: const Text('Refresh'),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Expanded(
                              child: FilledButton(
                                onPressed: authProvider.isMutating
                                    ? null
                                    : authProvider.signInMock,
                                child: const Text('Sign in mock'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        AppButton(
                          label: authProvider.isMutating
                              ? 'Please wait...'
                              : 'Sign out mock',
                          onPressed: authProvider.isMutating
                              ? null
                              : authProvider.signOutMock,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
